#!/bin/bash
set -euo pipefail

# 配置变量
REGION="ap-southeast-1"
ACCOUNT_ID="442729101249"
REPO="omnilaze-nexus"
CLUSTER="omnilaze-cluster"
SERVICE="omnilaze-nexus-service"
TASK_FAMILY="omnilaze-nexus"
VPC_ID="vpc-0a980ec72a6ab09bb"

echo "🔧 部署 Omnilaze Nexus 到 AWS ECS"
echo "Region: $REGION"
echo "Repository: $REPO"

# 确保 AWS CLI 和 Docker 可用
command -v aws >/dev/null 2>&1 || { echo "❌ 需要安装 AWS CLI"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ 需要安装 Docker"; exit 1; }

# 设置 AWS 区域
aws configure set region "$REGION"

# 1. 创建 ECR 仓库（如果不存在）
echo "📦 准备 ECR 仓库..."
aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1 || {
    echo "创建 ECR 仓库: $REPO"
    aws ecr create-repository --repository-name "$REPO" --region "$REGION"
}
echo "✅ ECR 仓库就绪"

# 2. 构建并推送 Docker 镜像
echo "🔨 构建 Docker 镜像..."
TAG=$(date +%Y%m%d-%H%M%S)
IMAGE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO:$TAG"

# 登录 ECR
aws ecr get-login-password --region "$REGION" | \
    docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# 构建镜像（可选传入 SYSTEM_API_KEY 用于前端打包 X-System-Key）
BUILD_ARGS=""
if [ -n "${SYSTEM_API_KEY:-}" ]; then
  echo "🔑 使用 SYSTEM_API_KEY 构建（仅用于演示，生产不建议在前端内嵌）"
  BUILD_ARGS="--build-arg VITE_SYSTEM_API_KEY=$SYSTEM_API_KEY"
fi
docker build --platform linux/amd64 $BUILD_ARGS -t "$IMAGE" .
echo "📤 推送镜像到 ECR..."
docker push "$IMAGE"
echo "✅ 镜像推送完成: $IMAGE"

# 3. 创建 CloudWatch 日志组（如果不存在）
echo "📝 准备 CloudWatch 日志组..."
aws logs create-log-group --log-group-name "/ecs/omnilaze-nexus" --region "$REGION" 2>/dev/null || true
echo "✅ 日志组就绪"

# 4. 创建目标组
echo "🎯 创建 ALB 目标组..."
TG_ARN=$(aws elbv2 create-target-group \
    --name omnilaze-nexus-tg \
    --port 80 \
    --protocol HTTP \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-enabled \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || {
        # 如果目标组已存在，获取其 ARN
        aws elbv2 describe-target-groups \
            --names omnilaze-nexus-tg \
            --region "$REGION" \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text
    })
echo "✅ 目标组就绪: $TG_ARN"

# 5. 创建 ECS 任务定义
echo "📋 创建 ECS 任务定义..."
cat > task-definition.json <<EOF
{
    "family": "$TASK_FAMILY",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
    "containerDefinitions": [{
        "name": "nexus",
        "image": "$IMAGE",
        "essential": true,
        "portMappings": [{
            "containerPort": 80,
            "protocol": "tcp"
        }],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "/ecs/omnilaze-nexus",
                "awslogs-region": "$REGION",
                "awslogs-stream-prefix": "ecs"
            }
        },
        "healthCheck": {
            "command": ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
            "interval": 30,
            "timeout": 5,
            "retries": 3,
            "startPeriod": 60
        }
    }]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json --region "$REGION"
echo "✅ 任务定义已注册"

# 6. 创建或更新 ECS 服务
echo "🚀 创建 ECS 服务..."
aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name "$SERVICE" \
    --task-definition "$TASK_FAMILY" \
    --desired-count 1 \
    --launch-type FARGATE \
    --platform-version LATEST \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-0aeb8249f85c37406,subnet-03c38f4ac44b88e54],securityGroups=[sg-0d1e86558af8fea7b],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=nexus,containerPort=80" \
    --health-check-grace-period-seconds 300 \
    --region "$REGION" 2>/dev/null || {
        echo "服务已存在，更新服务..."
        aws ecs update-service \
            --cluster "$CLUSTER" \
            --service "$SERVICE" \
            --task-definition "$TASK_FAMILY" \
            --region "$REGION"
    }

echo "✅ ECS 服务已创建/更新"

# 7. 等待服务稳定
echo "⏳ 等待服务启动..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION"
echo "✅ 服务已稳定运行"

# 输出信息
echo ""
echo "🎉 部署完成！"
echo "Target Group ARN: $TG_ARN"
echo "Docker Image: $IMAGE"
echo ""
echo "接下来需要配置 ALB 路由规则："
echo "1. 获取 ALB 监听器 ARN"
echo "2. 创建 /v1/* → Backend 的规则"
echo "3. 修改默认规则 → Nexus"
echo ""
echo "请运行: ./configure-alb-rules.sh $TG_ARN"

# 清理临时文件
rm -f task-definition.json

echo "✅ 部署脚本执行完成"
