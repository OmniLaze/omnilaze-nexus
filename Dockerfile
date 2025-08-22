# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm@10.14.0
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 设置构建环境变量
# 注意：VITE_BASE_PATH 用于配置前端在生产的路径前缀（规范：/admin/）
ARG VITE_BASE_PATH=/admin/
ARG VITE_SYSTEM_API_KEY=
ARG VITE_API_BASE_URL=/v1
ARG VITE_BUILD_ID=dev

ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_SYSTEM_API_KEY=${VITE_SYSTEM_API_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BUILD_ID=${VITE_BUILD_ID}
ENV NODE_ENV=production

# Debug: 显示构建时的环境变量
RUN echo "VITE_BASE_PATH: ${VITE_BASE_PATH}" && echo "VITE_BUILD_ID: ${VITE_BUILD_ID}" && echo "构建参数检查完成"

# 构建项目
RUN pnpm run build

# 运行阶段
FROM nginx:alpine

# 复制构建产物到 /admin 子目录，配合 VITE_BASE_PATH=/admin/
COPY --from=builder /app/dist /usr/share/nginx/html/admin

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
