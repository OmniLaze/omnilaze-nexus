#!/bin/bash
set -euo pipefail

REGION="ap-southeast-1"
NEXUS_TG_ARN="$1"

if [ $# -eq 0 ]; then
    echo "用法: $0 <NEXUS_TARGET_GROUP_ARN>"
    echo "例如: $0 arn:aws:elasticloadbalancing:ap-southeast-1:442729101249:targetgroup/omnilaze-nexus-tg/xxxxx"
    exit 1
fi

echo "🔧 配置 ALB 路由规则（新策略）"
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

# 策略：为 Nexus 创建 /admin/* 路径规则，保持默认规则指向后端
echo "📋 创建 /admin/* → Nexus 路由规则..."
aws elbv2 create-rule \
    --listener-arn "$HTTPS_LISTENER_ARN" \
    --priority 2 \
    --conditions Field=path-pattern,Values="/admin/*" \
    --actions Type=forward,TargetGroupArn="$NEXUS_TG_ARN" \
    --region "$REGION" || echo "规则可能已存在，继续..."

echo "✅ Nexus 管理界面路由规则已创建"

# 同样配置 HTTP 监听器（如果存在）
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --region "$REGION" \
    --query "Listeners[?Port==\`80\`].ListenerArn" \
    --output text 2>/dev/null || true)

if [ -n "$HTTP_LISTENER_ARN" ]; then
    echo "🔧 配置 HTTP 监听器路由..."
    
    # 创建 /admin/* → Nexus 的规则
    aws elbv2 create-rule \
        --listener-arn "$HTTP_LISTENER_ARN" \
        --priority 2 \
        --conditions Field=path-pattern,Values="/admin/*" \
        --actions Type=forward,TargetGroupArn="$NEXUS_TG_ARN" \
        --region "$REGION" || echo "HTTP 规则可能已存在，继续..."
    
    echo "✅ HTTP 路由规则已配置"
fi

echo ""
echo "🎉 ALB 路由配置完成！"
echo ""
echo "路由规则："
echo "  /v1/*       → Backend API"
echo "  /admin/*    → Nexus 管理界面"
echo "  / (默认)    → Backend API"
echo ""
echo "访问地址："
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --region "$REGION" \
    --query "LoadBalancers[0].DNSName" \
    --output text)
echo "  https://$ALB_DNS/admin/"
echo "  https://backend.omnilaze.co/admin/ (如果已配置域名)"
echo ""
echo "✅ 配置完成，可以访问 Nexus 管理界面了！"