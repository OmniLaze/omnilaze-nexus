import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export function QuickAdminAuth() {
  const { setAccessToken } = useAuthStore((state) => state.auth);

  const handleSetToken = () => {
    // 使用预生成的管理员token（这是临时解决方案）
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZfYWRtaW5fdXNlciIsInBob25lIjoiMTM4MDAwMDAwMDAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQwNzA2MDAsImV4cCI6MTcyNjY2MjYwMH0.TxXgGK2n_M_yVYo3vhNwqO8M1_Mv_pTqEO5HdJD8qGU';
    setAccessToken(adminToken);
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <h1 className="text-2xl font-bold">管理员认证</h1>
      <p className="text-muted-foreground">点击下方按钮设置管理员权限</p>
      <Button onClick={handleSetToken}>
        设置管理员权限
      </Button>
    </div>
  );
}