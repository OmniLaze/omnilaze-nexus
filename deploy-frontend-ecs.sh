#!/usr/bin/env bash
set -euo pipefail

# ====== 可配置变量 ======
REGION=${AWS_REGION:-"ap-southeast-1"}
REPO=${ECR_REPOSITORY:-"omnilaze-nexus"}
CLUSTER=${ECS_CLUSTER:-"omnilaze-cluster"}
SERVICE=${ECS_SERVICE:-"omnilaze-nexus-service"}
CONTAINER_NAME=${CONTAINER_NAME:-"nexus"}
CONTAINER_PORT=${CONTAINER_PORT:-"80"}
CPU=${CPU:-"256"}
MEMORY=${MEMORY:-"512"}

# 私有子网 & 安全组
SUBNETS=${SUBNETS:-"subnet-xxxxxxx,subnet-yyyyyyy"}
SECURITY_GROUPS=${SECURITY_GROUPS:-"sg-zzzzzzzz"}
ASSIGN_PUBLIC_IP=${ASSIGN_PUBLIC_IP:-"ENABLED"}

# 可选：ALB 目标组
TARGET_GROUP_ARN=${TARGET_GROUP_ARN:-""}

echo "🔧 AWS 区域: $REGION"
aws configure set region "$REGION"

# 1) 准备 ECR 仓库
aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name "$REPO"
echo "✅ ECR 仓库就绪: $REPO"

# 2) 构建并推送前端镜像
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [[ "$REGION" == cn-* ]]; then
  ECR_DOMAIN_SUFFIX="amazonaws.com.cn"
else
  ECR_DOMAIN_SUFFIX="amazonaws.com"
fi
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.$ECR_DOMAIN_SUFFIX/$REPO"
TAG=${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}
IMAGE="$ECR_URI:$TAG"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.$ECR_DOMAIN_SUFFIX"
# Prefer same-origin '/v1' and proxy at nginx, but allow override
BUILD_API_BASE_URL=${VITE_API_BASE_URL:-${FRONTEND_API_BASE_URL:-"/v1"}}
BUILD_ID=${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}
# Pass VITE_* at build-time so the SPA calls the right backend and sends the system key header
BUILD_NO_CACHE=${NO_CACHE:-}
if [ -n "$BUILD_NO_CACHE" ]; then
  BUILD_OPTS="--no-cache"
else
  BUILD_OPTS=""
fi
docker build $BUILD_OPTS \
  --build-arg VITE_BASE_PATH="/admin/" \
  --build-arg VITE_API_BASE_URL="$BUILD_API_BASE_URL" \
  --build-arg VITE_BUILD_ID="$BUILD_ID" \
  ${SYSTEM_API_KEY:+--build-arg VITE_SYSTEM_API_KEY="$SYSTEM_API_KEY"} \
  -t "$IMAGE" .
echo "🧩 Build args: VITE_BASE_PATH=/admin/ VITE_API_BASE_URL=$BUILD_API_BASE_URL VITE_BUILD_ID=$BUILD_ID VITE_SYSTEM_API_KEY=$([ -n "$SYSTEM_API_KEY" ] && echo "[set]" || echo "[empty]")"
docker push "$IMAGE"
echo "✅ 前端镜像已推送: $IMAGE"

# 3) 创建 ECS 集群（已存在则跳过）
aws ecs describe-clusters --clusters "$CLUSTER" --query 'clusters[0].status' --output text 2>/dev/null | grep -qi ACTIVE || \
aws ecs create-cluster --cluster-name "$CLUSTER"
echo "✅ 集群就绪: $CLUSTER"

# 4) 创建 Execution Role
EXEC_ROLE_NAME=${EXEC_ROLE_NAME:-"ecsTaskExecutionRole"}
if ! aws iam get-role --role-name "$EXEC_ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$EXEC_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
    }' >/dev/null
  aws iam attach-role-policy --role-name "$EXEC_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
fi
EXEC_ROLE_ARN=$(aws iam get-role --role-name "$EXEC_ROLE_NAME" --query 'Role.Arn' --output text)
TASK_ROLE_ARN=${TASK_ROLE_ARN:-$EXEC_ROLE_ARN}

# 5) 生成 Task Definition
cat > taskdef-nexus.json <<JSON
{
  "family": "omnilaze-nexus",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "$CPU",
  "memory": "$MEMORY",
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$CONTAINER_NAME",
      "image": "$IMAGE",
      "essential": true,
      "portMappings": [{ "containerPort": $CONTAINER_PORT }],
      "environment": [],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$SERVICE",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
JSON

TD_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef-nexus.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "✅ 任务定义: $TD_ARN"

# 6) 创建/更新 ECS Service
NETWORK_CFG="awsvpcConfiguration={subnets=[$(echo $SUBNETS | sed 's/[^,][^,]*/\"&\"/g')],securityGroups=[$(echo $SECURITY_GROUPS | sed 's/[^,][^,]*/\"&\"/g')],assignPublicIp=$ASSIGN_PUBLIC_IP}"

if ! aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].status' --output text 2>/dev/null | grep -qi ACTIVE; then
  if [ -n "$TARGET_GROUP_ARN" ]; then
    aws ecs create-service \
      --cluster "$CLUSTER" \
      --service-name "$SERVICE" \
      --task-definition "$TD_ARN" \
      --desired-count 1 \
      --launch-type FARGATE \
      --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=$CONTAINER_NAME,containerPort=$CONTAINER_PORT \
      --network-configuration "$NETWORK_CFG"
  else
    aws ecs create-service \
      --cluster "$CLUSTER" \
      --service-name "$SERVICE" \
      --task-definition "$TD_ARN" \
      --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "$NETWORK_CFG"
  fi
  echo "✅ 已创建前端服务: $SERVICE"
else
  aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$TD_ARN" >/dev/null
  echo "✅ 已更新前端服务: $SERVICE"
fi

echo "🎉 前端部署完成"
echo "- 镜像: $IMAGE"
echo "- 集群: $CLUSTER"
echo "- 服务: $SERVICE"
echo "- 子网: $SUBNETS"
echo "- 安全组: $SECURITY_GROUPS"
echo "- 公网IP: $ASSIGN_PUBLIC_IP"
