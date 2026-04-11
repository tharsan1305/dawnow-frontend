import { useState, useEffect } from 'react'
import { adminAPI } from '../../api'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import {
    Users,
    FileText,
    Clock,
    Key,
    Award,
    BookOpen,
    Lightbulb,
    TrendingUp,
    Calendar,
    AlertCircle
} from 'lucide-react'
import BannerBox from '../../components/ui/BannerBox'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalStaff: 0,
        reportsThisMonth: 0,
        pendingApprovals: 0,
        pendingPwdRequests: 0,
        recentActivity: [],
        // New analytics fields
        totalPapers: 0,
        totalProjects: 0,
        totalPatents: 0,
        totalBooks: 0,
        totalActivities: 0
    })
    const [loading, setLoading] = useState(true)
    const [departmentData, setDepartmentData] = useState([])
    const [monthlyData, setMonthlyData] = useState([])
    const [activityData, setActivityData] = useState([])
    const [todayStatus, setTodayStatus] = useState({ submitted: [], absent: [], summary: { total: 0, submitted: 0, absent: 0 } })

    const fetchTodayStatus = async () => {
        try {
            const data = await adminAPI.getTodayStatus()
            if (data) setTodayStatus(data)
        } catch (error) {
            console.error('Error fetching today status:', error)
        }
    }

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await adminAPI.getDashboardStats()
                
                setStats({
                    totalStaff: data.totalStaff || 0,
                    reportsThisMonth: data.reportsThisMonth || 0,
                    pendingApprovals: data.pendingApprovals || 0,
                    pendingPwdRequests: data.pendingPwdRequests || 0,
                    recentActivity: data.recentActivity || [],
                    totalPapers: data.totalPapers || 0,
                    totalProjects: data.totalProjects || 0,
                    totalPatents: data.totalPatents || 0,
                    totalBooks: data.totalBooks || 0,
                    totalActivities: data.totalActivities || 0
                })

                if (data.departmentStats) setDepartmentData(data.departmentStats)
                if (data.monthlyStats) setMonthlyData(data.monthlyStats)
                if (data.activityDistribution) setActivityData(data.activityDistribution)
            } catch (error) {
                console.error('Error fetching dashboard:', error)
                // Demo data fallback
                setDepartmentData([
                    { name: 'CSE', papers: 45, projects: 12, patents: 5 },
                    { name: 'ECE', papers: 38, projects: 8, patents: 3 },
                    { name: 'EEE', papers: 28, projects: 15, patents: 2 },
                    { name: 'MECH', papers: 22, projects: 10, patents: 4 },
                    { name: 'CIVIL', papers: 18, projects: 6, patents: 1 },
                    { name: 'IT', papers: 35, projects: 9, patents: 6 }
                ])
                setMonthlyData([
                    { month: 'Jul', submissions: 45 }, { month: 'Aug', submissions: 52 },
                    { month: 'Sep', submissions: 48 }, { month: 'Oct', submissions: 65 },
                    { month: 'Nov', submissions: 72 }, { month: 'Dec', submissions: 58 },
                    { month: 'Jan', submissions: 80 }, { month: 'Feb', submissions: 85 },
                    { month: 'Mar', submissions: 92 }
                ])
                setActivityData([
                    { name: 'Papers', value: 186, color: '#3b82f6' },
                    { name: 'Projects', value: 60, color: '#22c55e' },
                    { name: 'Patents', value: 21, color: '#f59e0b' },
                    { name: 'Books', value: 15, color: '#8b5cf6' },
                    { name: 'Activities', value: 120, color: '#ef4444' }
                ])
            } finally {
                setLoading(false)
            }
        }

        fetchDashboard()
        fetchTodayStatus()

        // Auto refresh every 5 minutes
        const interval = setInterval(() => {
            fetchDashboard()
            fetchTodayStatus()
        }, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'warning',
            approved: 'success',
            rejected: 'danger'
        }
        return <Badge variant={variants[status]}>{status}</Badge>
    }

    return (
        <div className="space-y-6">
            <BannerBox />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Staff"
                    value={stats.totalStaff}
                    icon={Users}
                    color="green"
                />
                <StatCard
                    title="Reports This Month"
                    value={stats.reportsThisMonth}
                    icon={FileText}
                    color="blue"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    icon={Clock}
                    color="amber"
                />
                <StatCard
                    title="Pending Pwd Requests"
                    value={stats.pendingPwdRequests}
                    icon={Key}
                    color="red"
                />
            </div>

            {/* Research Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Papers</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalPapers}</p>
                        </div>
                        <FileText size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Projects</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalProjects}</p>
                        </div>
                        <Award size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm">Patents</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalPatents}</p>
                        </div>
                        <Lightbulb size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Books</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalBooks}</p>
                        </div>
                        <BookOpen size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-pink-100 text-sm">Activities</p>
                            <p className="text-3xl font-bold mt-1">{stats.totalActivities}</p>
                        </div>
                        <Users size={32} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Today's Submission Status (Feature 6) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="font-heading font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar size={20} className="text-primary-green" />
                        Today's Submission Status
                    </h2>
                    <div className="flex gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {todayStatus?.summary?.submitted || 0} submitted
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {todayStatus?.summary?.absent || 0} not submitted
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    {/* Submitted Today */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <Clock size={16} /> ✅ Submitted Today
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {(todayStatus?.submitted || []).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No submissions yet.</p>
                            ) : (
                                (todayStatus?.submitted || []).map((staff, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50/50 rounded-lg border border-green-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{staff.name}</p>
                                                <p className="text-[10px] text-gray-500">{staff.department}</p>
                                            </div>
                                        </div>
                                        <Badge variant="success">{staff.status}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Not Submitted Today */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <AlertCircle size={16} /> ❌ Not Submitted Today
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {(todayStatus?.absent || []).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">All staff members have submitted!</p>
                            ) : (
                                (todayStatus?.absent || []).map((staff, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50/50 rounded-lg border border-red-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{staff.name}</p>
                                                <p className="text-[10px] text-gray-500">{staff.department}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                API.post('/admin/notifications', {
                                                    recipient: staff._id,
                                                    title: 'Submission Reminder',
                                                    message: 'Please submit your today\'s report for auto-approval.'
                                                });
                                                alert(`Reminder sent to ${staff.name}`);
                                            }}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-tighter"
                                        >
                                            Send Reminder
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Department Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-heading font-semibold text-gray-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-primary-green" />
                            Research by Department
                        </h3>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departmentData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="papers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="projects" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart - Activity Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-heading font-semibold text-gray-800 flex items-center gap-2">
                            <Calendar size={20} className="text-primary-green" />
                            Activity Distribution
                        </h3>
                    </div>
                    <div className="h-72 flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={activityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {activityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Line Chart - Monthly Submissions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading font-semibold text-gray-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-green" />
                        Monthly Submission Trend
                    </h3>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="submissions"
                                stroke="#22c55e"
                                strokeWidth={3}
                                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-heading font-semibold text-gray-800">Recent Activity</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-green"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : stats.recentActivity.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText size={48} className="text-gray-300 mb-2" />
                                            <p>No recent activity found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                stats.recentActivity.map((activity, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600">{activity.staffName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{activity.department}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{activity.action}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(activity.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(activity.status)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
