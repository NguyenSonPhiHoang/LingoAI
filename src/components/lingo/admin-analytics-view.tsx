"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, TrendingUp, BookOpen, Clock, CheckCircle, Activity, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminOverview, type AdminOverview } from "@/services/admin-analytics";

// ── Mini inline bar chart ───────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-white/60 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Line sparkline ──────────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-white/30 text-xs">Không có dữ liệu</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 300, H = 60, pad = 4;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - ((d.count / max) * (H - pad * 2));
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline points={pts.join(" ")} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Area fill */}
      <polygon
        points={`${pad},${H} ${pts.join(" ")} ${W - pad},${H}`}
        fill="url(#spark-fill)"
      />
      {/* Dots */}
      {data.map((d, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#6366f1" opacity="0.9" />;
      })}
    </svg>
  );
}

// ── KPI Card ────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, gradient }: {
  icon: any; label: string; value: string | number; sub?: string; gradient: string;
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.3)" }} />
      <div className="relative z-10">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-white/70 text-xs mt-0.5">{label}</div>
        {sub && <div className="text-white/50 text-[10px] mt-1">{sub}</div>}
      </div>
    </div>
  );
}

const SKILL_COLORS: Record<string, string> = {
  listening:    "#6366f1",
  speaking:     "#10b981",
  reading:      "#f59e0b",
  writing:      "#8b5cf6",
  pronunciation:"#ef4444",
  vocabulary:   "#06b6d4",
  grammar:      "#ec4899",
};

function skillColor(skill: string) {
  return SKILL_COLORS[skill?.toLowerCase()] ?? "#6366f1";
}

// ── Main component ──────────────────────────────────────────────
export default function AdminAnalyticsView() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminOverview()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
  if (error) return (
    <div className="rounded-2xl p-8 text-center text-destructive bg-destructive/10">
      Lỗi tải dữ liệu: {error}
    </div>
  );
  if (!data) return null;

  const { userStats, registrationsByDay, testStats, testsBySkill, sessionStats, topActiveUsers } = data;
  const maxSkillAttempts = Math.max(...testsBySkill.map(s => s.attempts), 1);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)" }}>
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle,#818cf8,transparent)" }} />
        <div className="relative z-10 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-indigo-300" />
          <div>
            <h2 className="text-2xl font-bold text-white">Thống Kê Tổng Quan</h2>
            <p className="text-indigo-200 text-sm">Dữ liệu hoạt động người dùng theo thời gian thực</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users}      label="Tổng người dùng"      value={userStats.total}          sub={`${userStats.approved} đã duyệt`}  gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" />
        <KpiCard icon={Activity}   label="Hoạt động 7 ngày qua" value={userStats.activeLastWeek}  sub="người dùng làm bài"                gradient="linear-gradient(135deg,#10b981,#059669)" />
        <KpiCard icon={BookOpen}   label="Tổng lượt làm bài"    value={testStats.totalAttempts}   sub={testStats.avgScore != null ? `Điểm TB: ${testStats.avgScore}` : undefined} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
        <KpiCard icon={Clock}      label="Chờ duyệt"            value={userStats.pending}         sub={`${userStats.rejected} bị từ chối`} gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
      </div>

      {/* Row 2: Registration chart + User breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Registration trend */}
        <Card className="md:col-span-2 border-white/10" style={{ background: "linear-gradient(135deg,rgba(17,17,34,0.9),rgba(30,27,75,0.9))" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" /> Đăng ký theo ngày (30 ngày)
            </CardTitle>
            <CardDescription className="text-white/40 text-xs">
              Tổng {registrationsByDay.reduce((s, d) => s + d.count, 0)} người đăng ký gần đây
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline data={registrationsByDay} />
            {registrationsByDay.length > 0 && (
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>{registrationsByDay[0]?.date}</span>
                <span>{registrationsByDay[registrationsByDay.length - 1]?.date}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User breakdown */}
        <Card className="border-white/10" style={{ background: "linear-gradient(135deg,rgba(17,17,34,0.9),rgba(30,27,75,0.9))" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" /> Phân bổ người dùng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Học sinh",    value: userStats.students, color: "#6366f1" },
              { label: "Giáo viên",   value: userStats.teachers, color: "#10b981" },
              { label: "Admin",       value: userStats.admins,   color: "#f59e0b" },
              { label: "Đã duyệt",   value: userStats.approved, color: "#22c55e" },
              { label: "Chờ duyệt",  value: userStats.pending,  color: "#f59e0b" },
              { label: "Bị từ chối", value: userStats.rejected, color: "#ef4444" },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-white/70">
                  <span>{item.label}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
                <MiniBar value={item.value} max={userStats.total} color={item.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Skill performance + Session stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Skill performance */}
        <Card className="md:col-span-2 border-white/10" style={{ background: "linear-gradient(135deg,rgba(17,17,34,0.9),rgba(30,27,75,0.9))" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" /> Hiệu suất theo kỹ năng
            </CardTitle>
            <CardDescription className="text-white/40 text-xs">Điểm trung bình và số lượt làm bài</CardDescription>
          </CardHeader>
          <CardContent>
            {testsBySkill.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">Chưa có dữ liệu bài thi</p>
            ) : (
              <div className="space-y-4">
                {testsBySkill.map(skill => (
                  <div key={skill.skill} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white font-medium capitalize">{skill.skill}</span>
                      <div className="flex items-center gap-3 text-white/60">
                        <span>{skill.attempts} lượt</span>
                        {skill.accuracy != null && <span className="text-green-400">{skill.accuracy}% đúng</span>}
                        {skill.avgScore != null && <span className="text-indigo-300">{skill.avgScore} điểm</span>}
                      </div>
                    </div>
                    <MiniBar value={skill.attempts} max={maxSkillAttempts} color={skillColor(skill.skill)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session stats */}
        <Card className="border-white/10" style={{ background: "linear-gradient(135deg,rgba(17,17,34,0.9),rgba(30,27,75,0.9))" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-400" /> Phiên học
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Tổng phiên",         value: String(sessionStats.totalSessions),                         icon: "📚" },
              { label: "Thời gian TB / phiên", value: sessionStats.avgDurationMin != null ? `${sessionStats.avgDurationMin} phút` : "N/A", icon: "⏱️" },
              { label: "Tỷ lệ hoàn thành",   value: sessionStats.completionRate  != null ? `${sessionStats.completionRate}%`   : "N/A", icon: "✅" },
              { label: "Tổng lượt làm bài",  value: String(testStats.totalAttempts),                           icon: "📝" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="text-white font-bold text-lg leading-none">{item.value}</div>
                  <div className="text-white/50 text-xs mt-0.5">{item.label}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top active users table */}
      <Card className="border-white/10" style={{ background: "linear-gradient(135deg,rgba(17,17,34,0.9),rgba(30,27,75,0.9))" }}>
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" /> Top 10 người dùng hoạt động nhất
          </CardTitle>
          <CardDescription className="text-white/40 text-xs">Xếp hạng theo số lượt làm bài thi</CardDescription>
        </CardHeader>
        <CardContent>
          {topActiveUsers.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left py-2 pl-2 w-8">#</th>
                    <th className="text-left py-2">Tên</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-right py-2">Số bài</th>
                    <th className="text-right py-2">Điểm TB</th>
                    <th className="text-right py-2 pr-2">Hoạt động cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {topActiveUsers.map((u, idx) => (
                    <tr key={u.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pl-2">
                        {idx < 3 ? (
                          <span className="text-base">{["🥇","🥈","🥉"][idx]}</span>
                        ) : (
                          <span className="text-white/40 text-xs">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2.5 text-white font-medium">{u.displayName}</td>
                      <td className="py-2.5 text-white/50 text-xs">{u.email}</td>
                      <td className="py-2.5 text-right">
                        <Badge className="text-[11px]" style={{ background: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "none" }}>
                          {u.attempts} lượt
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-white/80">
                        {u.avgScore != null ? `${u.avgScore}` : "—"}
                      </td>
                      <td className="py-2.5 text-right text-white/40 text-xs pr-2">
                        {u.lastActive ? new Date(u.lastActive).toLocaleDateString("vi-VN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
