// 临时管理员认证脚本
// 在浏览器控制台中运行以设置管理员token

// 创建一个模拟的管理员JWT token
const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZfYWRtaW5fdXNlciIsInBob25lIjoiMTM4MDAwMDAwMDAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2ODc5MjAwMDAsImV4cCI6MjAwMzI4MDAwMH0.dummy_signature";

// 使用Nexus的认证存储设置token
window.useAuthStore.getState().auth.setAccessToken(adminToken);

console.log("管理员token已设置，刷新页面以生效");