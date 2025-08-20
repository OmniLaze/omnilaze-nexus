#!/bin/bash
set -euo pipefail

REGION="ap-southeast-1"
NEXUS_TG_ARN="$1"

if [ $# -eq 0 ]; then
    echo "用法: $0 <NEXUS_TARGET_GROUP_ARN>"
    echo "例如: $0 arn:aws:elasticloadbalancing:ap-southeast-1:442729101249:targetgroup/omnilaze-nexus-tg/xxxxx"
    exit 1
fi

echo "🔧 配置 ALB 路由规则"
echo "Nexus Target Group: $NEXUS_TG_ARN"

# 获取 ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --region "$REGION" \
    --query "LoadBalancers[?contains(LoadBalancerName, 'omnilaze-alb-secure')].LoadBalancerArn" \
    --output text)

if [ -z "$ALB_ARN" ]; then
    echo "❌ 未找到 omnilaze-alb-secure 负载均衡器"
    exit 1
fi

echo "✅ 找到 ALB: $ALB_ARN"

# 获取 HTTPS 监听器 ARN
HTTPS_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --region "$REGION" \
    --query "Listeners[?Port==\`443\`].ListenerArn" \
    --output text)

if [ -z "$HTTPS_LISTENER_ARN" ]; then
    echo "❌ 未找到 HTTPS 监听器"
    exit 1
fi

echo "✅ 找到 HTTPS 监听器: $HTTPS_LISTENER_ARN"

# 获取后端目标组 ARN
BACKEND_TG_ARN=$(aws elbv2 describe-target-groups \
    --region "$REGION" \
    --query "TargetGroups[?contains(TargetGroupName, 'omnilaze-tg-secure')].TargetGroupArn" \
    --output text)

if [ -z "$BACKEND_TG_ARN" ]; then
    echo "❌ 未找到后端目标组"
    exit 1
fi

echo "✅ 找到后端目标组: $BACKEND_TG_ARN"

# 获取默认规则 ARN
DEFAULT_RULE_ARN=$(aws elbv2 describe-rules \
    --listener-arn "$HTTPS_LISTENER_ARN" \
    --region "$REGION" \
    --query "Rules[?Priority=='default'].RuleArn" \
    --output text)

echo "✅ 找到默认规则: $DEFAULT_RULE_ARN"

# 1. 创建 /v1/* → Backend 的规则（优先级 1）
echo "📋 创建 /v1/* → Backend 路由规则..."
aws elbv2 create-rule \
    --listener-arn "$HTTPS_LISTENER_ARN" \
    --priority 1 \
    --conditions Field=path-pattern,Values="/v1/*" \
    --actions Type=forward,TargetGroupArn="$BACKEND_TG_ARN" \
    --region "$REGION" || echo "规则可能已存在，继续..."

echo "✅ Backend API 路由规则已创建"

# 2. 修改默认规则 → Nexus
echo "📋 修改默认规则指向 Nexus..."
aws elbv2 modify-rule \
    --rule-arn "$DEFAULT_RULE_ARN" \
    --actions Type=forward,TargetGroupArn="$NEXUS_TG_ARN" \
    --region "$REGION"

echo "✅ 默认路由规则已更新"

# 同样配置 HTTP 监听器（如果存在）
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --region "$REGION" \
    --query "Listeners[?Port==\`80\`].ListenerArn" \
    --output text 2>/dev/null || true)

if [ -n "$HTTP_LISTENER_ARN" ]; then
    echo "🔧 配置 HTTP 监听器路由..."
    
    # 获取 HTTP 默认规则
    HTTP_DEFAULT_RULE_ARN=$(aws elbv2 describe-rules \
        --listener-arn "$HTTP_LISTENER_ARN" \
        --region "$REGION" \
        --query "Rules[?Priority=='default'].RuleArn" \
        --output text)
    
    # 创建 /v1/* → Backend 的规则
    aws elbv2 create-rule \
        --listener-arn "$HTTP_LISTENER_ARN" \
        --priority 1 \
        --conditions Field=path-pattern,Values="/v1/*" \
        --actions Type=forward,TargetGroupArn="$BACKEND_TG_ARN" \
        --region "$REGION" || echo "HTTP 规则可能已存在，继续..."
    
    # 修改默认规则
    aws elbv2 modify-rule \
        --rule-arn "$HTTP_DEFAULT_RULE_ARN" \
        --actions Type=forward,TargetGroupArn="$NEXUS_TG_ARN" \
        --region "$REGION"
    
    echo "✅ HTTP 路由规则已配置"
fi

echo ""
echo "🎉 ALB 路由配置完成！"
echo ""
echo "路由规则："
echo "  / (默认)    → Nexus 管理界面"
echo "  /v1/*       → Backend API"
echo ""
echo "访问地址："
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --region "$REGION" \
    --query "LoadBalancers[0].DNSName" \
    --output text)
echo "  https://$ALB_DNS"
echo "  https://backend.omnilaze.co (如果已配置域名)"
echo ""
echo "✅ 配置完成，可以访问 Nexus 管理界面了！"