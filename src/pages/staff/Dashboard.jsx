import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffAPI, announcementAPI } from '../../api';
import {
    CheckCircle, XCircle, Clock, AlertCircle, Bell, ArrowRight,
    FileText, UserCircle, Calendar, Target, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, isSameDay, startOfMonth } from 'date-fns';
import { socket } from '../../socket';

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [notices, setNotices] = useState([]);
    const [cutoffTime, setCutoffTime] = useState('17:00');
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isAfterCutoff, setIsAfterCutoff] = useState(false);
    
    const [stats, setStats] = useState({
        thisWeek: 0,
        approved: 0,
        pending: 0,
        completed: 0,
        thisMonth: 0
    });
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [weekReports, setWeekReports] = useState([]);
    const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0, thisWeek: 0 });
    const [targetData, setTargetData] = useState(null);

    const fetchData = async () => {
        try {
            const [weekData, monthData, noticeData, settingsData, streakData, targetData] = await Promise.all([
                staffAPI.getMyReports({ range: 'week' }),
                staffAPI.getMyReports({ range: 'month' }),
                announcementAPI.getAll({ target: 'staff' }),
                staffAPI.getSettings(),
                staffAPI.getStreak(),
                staffAPI.getResearchTargets()
            ]);

            setStats({
                thisWeek: weekData.total || 0,
                approved: weekData.approved || 0,
                pending: weekData.pendingCount || 0,
                completed: weekData.completed || 0,
                thisMonth: monthData.total || 0
            });

            setRecentSubmissions(weekData.reports || []);
            setWeekReports(weekData.reports || []);
            setStreakData(streakData || { currentStreak: 0, longestStreak: 0, thisWeek: 0 });
            setTargetData(targetData || null);
            setNotices(noticeData || []);
            
            if (settingsData?.value) {
                setCutoffTime(settingsData.value);
            }

        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Auto refresh
        const interval = setInterval(fetchData, 30000);
        
        // Refresh on tab visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Socket listener for real-time updates
        socket.on('report_updated', fetchData);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.off('report_updated', fetchData);
        };
    }, []);

    // Timer logic
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const [hours, minutes] = cutoffTime.split(':').map(Number);

            const cutoffDate = new Date(now);
            cutoffDate.setHours(hours, minutes, 0, 0);

            if (now > cutoffDate) {
                setIsAfterCutoff(true);
                setTimeRemaining('');
            } else {
                setIsAfterCutoff(false);
                const diffMs = cutoffDate - now;
                const hrs = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                setTimeRemaining(`${hrs} hours ${mins} mins`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [cutoffTime]);

    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 6 }).map((_, i) => addDays(monday, i));

    const checkDayStatus = (date) => {
        const report = weekReports.find(r => {
            const reportDate = new Date(r.date);
            return reportDate.toDateString() === date.toDateString();
        });
        if (!report) return 'not-submitted';
        return report.status; 
    };

    const hasSubmittedToday = checkDayStatus(today) !== 'not-submitted';

    if (loading) return <div className="p-8 text-center text-primary-green animate-pulse">Loading Workspace...</div>;

    return (
        <div className="space-y-6 pb-12 bg-[#f0fdf4] min-h-screen -m-6 p-6">
            
            {/* Urgent Broadcast / Notice Banner (Feature 4) */}
            {notices.find(n => n.priority === 'Urgent') && (
                <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg shadow-red-200 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Urgent Message from Admin</p>
                            <h3 className="text-lg font-black tracking-tight uppercase">{notices.find(n => n.priority === 'Urgent').title}</h3>
                            <p className="text-sm font-medium text-white/90 line-clamp-1">{notices.find(n => n.priority === 'Urgent').content}</p>
                        </div>
                    </div>
                    <Link 
                        to="/staff/informative" 
                        className="px-6 py-2 bg-white text-red-600 font-black uppercase text-xs rounded-lg hover:bg-gray-100 transition-all shadow-md"
                    >
                        View Full Message
                    </Link>
                </div>
            )}

            {/* Auto Approval Timer */}
            <div className={`p-4 rounded-xl shadow-sm font-bold flex items-center justify-center ${isAfterCutoff ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-primary-green text-white shadow-lg shadow-primary-green/20'}`}>
                {isAfterCutoff ? (
                    <><AlertCircle className="w-5 h-5 mr-2" /> ⚠️ Cutoff passed — submission needs admin approval</>
                ) : (
                    <><Clock className="w-5 h-5 mr-2" /> ⏰ Auto-approval active until {cutoffTime} PM today. ⏱ {timeRemaining} left to auto-approve!</>
                )}
            </div>

            {/* Streak Tracker (Feature 3) */}
            <div className="bg-white rounded-xl shadow-sm border border-[#bbf7d0] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#1f2937]">Research Streak Tracker</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {streakData.currentStreak > 0 ? (
                                streakData.currentStreak >= 7 ? "🏆 Amazing! 7+ day streak!" : "You're on fire! Keep it up! 🔥"
                            ) : "Start your streak today! 💪"}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-8 md:gap-12">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Streak</p>
                        <p className="text-3xl font-black text-orange-600">🔥 {streakData.currentStreak} <span className="text-sm">Days</span></p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Longest Streak</p>
                        <p className="text-xl font-black text-slate-700">📅 {streakData.longestStreak} <span className="text-sm text-slate-500">Days</span></p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">This Week</p>
                        <p className="text-xl font-black text-primary-green">📈 {streakData.thisWeek}/6 <span className="text-sm text-slate-500">Submitted</span></p>
                    </div>
                </div>
            </div>

            {/* Annual Research Target (Feature 8) */}
            <div className="bg-white rounded-xl shadow-sm border border-[#bbf7d0] p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary-green"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-primary-green">
                            <Target size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[#1f2937]">Annual Research Target ({targetData?.year})</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Overall Progress: {targetData?.totalProgress || 0}% Completed</p>
                        </div>
                    </div>

                    <div className="flex-1 max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'SCI Paper', key: 'papers', color: 'bg-blue-500' },
                            { label: 'Funded Project', key: 'projects', color: 'bg-emerald-500' },
                            { label: 'Patent', key: 'patents', color: 'bg-amber-500' }
                        ].map(item => {
                            const percent = targetData?.percentages?.[item.key] || 0;
                            const count = targetData?.counts?.[item.key] || 0;
                            const target = targetData?.targets?.[item.key] || 1;
                            
                            return (
                                <div key={item.key}>
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[10px] font-black uppercase text-slate-400">{item.label}</span>
                                        <span className="text-xs font-black text-[#1f2937]">{count}/{target}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold mt-1 text-slate-400 uppercase">{percent}% Reached</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#bbf7d0] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-green/5 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-[#1f2937] tracking-tight">
                        Welcome back, <span className="text-[#16a34a]">Dr. {user?.name.split(' ')[0]}</span> 👋
                    </h1>
                    <div className="flex items-center mt-3 space-x-3 text-sm">
                        <span className="font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{format(today, 'EEEE, dd MMMM yyyy')}</span>
                        <span className="font-bold text-primary-green bg-primary-green/10 px-3 py-1 rounded-full uppercase">{user?.department || 'EEE'}</span>
                    </div>
                </div>
                <div className="relative z-10">
                    {hasSubmittedToday ? (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-black bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle className="w-5 h-5 mr-2" /> ✅ Submitted Today
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-black bg-orange-50 text-orange-700 border border-orange-200">
                            <AlertCircle className="w-5 h-5 mr-2" /> ⚠️ Not Submitted Yet
                        </span>
                    )}
                </div>
            </div>

            {/* Section 2 - Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border-l-4 border-l-primary-green border-[#bbf7d0] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">📄 This Week Submissions</p>
                    <p className="text-3xl font-black text-[#1f2937]">{stats.thisWeek}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-l-4 border-l-green-500 border-[#bbf7d0] shadow-sm font-bold">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">✅ Completed Reports</p>
                    <p className="text-3xl font-black text-green-600">{stats.completed}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-l-4 border-l-red-500 border-[#bbf7d0] shadow-sm font-bold">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">⏳ Pending Reports</p>
                    <p className="text-3xl font-black text-red-600">{stats.pending}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-l-4 border-l-primary-green border-[#bbf7d0] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">📅 This Month Total</p>
                    <p className="text-3xl font-black text-[#1f2937]">{stats.thisMonth || 0}</p>
                </div>
            </div>

            {/* Section 3 - This Week Status */}
            <div className="bg-white rounded-xl shadow-sm border border-[#bbf7d0] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-[#f0fdf4]">
                    <h2 className="font-bold text-[#1f2937] flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-green" /> This Week's Status
                    </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {weekDates.map((date, i) => {
                        const isCurrentDay = isSameDay(date, today);
                        const match = weekReports.find(t => isSameDay(new Date(t.date), date));
                        
                        let Icon = <XCircle className="w-8 h-8 text-pink-400 mx-auto mb-2" />;
                        let statusText = "❌ Not Submitted";
                        
                        if (match) {
                            if (match.status === 'Completed' || match.status === 'approved') {
                                Icon = <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />;
                                statusText = "✅ Completed";
                            } else {
                                Icon = <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />;
                                statusText = "🟡 In Review";
                            }
                        }

                        return (
                            <div key={i} className={`p-4 text-center ${isCurrentDay ? 'bg-green-50/50 ring-2 ring-primary-green inset-0' : ''}`}>
                                <p className="text-xs font-black text-slate-400 uppercase">{format(date, 'EEE')}</p>
                                <p className="text-sm font-bold text-[#1f2937] mb-3">{format(date, 'dd MMM')}</p>
                                {Icon}
                                <span className={`text-[10px] uppercase font-bold ${match ? (match.status === 'Completed' || match.status === 'approved' ? 'text-green-600' : 'text-yellow-600') : 'text-red-500'}`}>
                                    {match ? (match.status === 'Completed' || match.status === 'approved' ? 'Completed' : 'Review') : 'Pending'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section 4 - Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Recent Submissions */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#bbf7d0] overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100">
                        <h2 className="font-bold text-[#1f2937] flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-primary-green" /> Recent Submissions
                        </h2>
                    </div>
                    <div className="flex-1 p-0">
                        {recentSubmissions.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No submissions recorded yet.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentSubmissions.map((task, i) => (
                                    <li key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#1f2937]">{task.activityTitle || task.paperTitle || 'Task Entry'}</span>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-[10px] font-black uppercase text-primary-green bg-primary-green/10 px-2 py-0.5 rounded">
                                                    {task.academicYear || 'General'}
                                                </span>
                                                <span className="text-xs text-slate-500">{format(new Date(task.date), 'dd MMM yyyy')}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                                ${(task.status === 'Completed' || task.status === 'approved') ? 'bg-green-100 text-green-800' : 
                                                  task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                  'bg-red-100 text-red-800'}`}>
                                                {task.status === 'approved' ? 'Completed' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                        <Link to="/staff/daily-log" className="text-xs font-black text-primary-green hover:underline uppercase tracking-wider flex items-center justify-center">
                            View All History <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                    </div>
                </div>

                {/* Right Column: Actions & Notices */}
                <div className="space-y-6 flex flex-col">
                    
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#bbf7d0] p-5">
                        <h2 className="font-bold text-[#1f2937] mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <Link to="/staff/task-entry" className="flex items-center justify-center w-full bg-primary-green hover:bg-green-700 text-white p-3 rounded-lg font-bold shadow-md transition-all">
                                📝 Submit Today's Report
                            </Link>
                            <div className="grid grid-cols-2 gap-3">
                                <Link to="/staff/daily-log" className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:border-primary-green hover:bg-green-50 transition-all text-[#1f2937]">
                                    <FileText className="w-5 h-5 mb-1 text-slate-500" />
                                    <span className="text-[10px] font-bold uppercase">📋 History</span>
                                </Link>
                                <Link to="/staff/notifications" className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:border-primary-green hover:bg-green-50 transition-all text-[#1f2937]">
                                    <Bell className="w-5 h-5 mb-1 text-slate-500" />
                                    <span className="text-[10px] font-bold uppercase">🔔 Notices</span>
                                </Link>
                                <Link to="/staff/profile" className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:border-primary-green hover:bg-green-50 transition-all text-[#1f2937] col-span-2">
                                    <UserCircle className="w-5 h-5 mb-1 text-slate-500" />
                                    <span className="text-[10px] font-bold uppercase">👤 My Profile</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* CFRD Notice Board */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#bbf7d0] p-5 flex-1">
                        <h2 className="font-bold text-[#1f2937] mb-4 flex items-center">
                            <Bell className="w-5 h-5 mr-2 text-primary-green" /> CFRD Notice Board
                        </h2>
                        <div className="space-y-3 relative z-10">
                            {notices.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">No new announcements.</p>
                            ) : (
                                notices.slice(0, 3).map((notice, i) => (
                                    <div key={i} className="border-l-4 border-l-primary-green pl-3 py-1 bg-slate-50 rounded-r-lg pr-2">
                                        <h4 className="text-sm font-bold text-[#1f2937] line-clamp-1">{notice.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{format(new Date(notice.createdAt), 'dd MMM yyyy')}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default Dashboard;
