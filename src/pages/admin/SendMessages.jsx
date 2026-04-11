import { useState, useEffect } from 'react'
import API from '../../api/axios'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const SendMessages = () => {
    const [notifications, setNotifications] = useState([])
    const [allStaff, setAllStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const [formData, setFormData] = useState({
        targetType: 'All',
        targetDepartment: '',
        targetUsers: [],
        priority: 'Normal',
        category: 'General',
        title: '',
        content: '', // Notice model uses 'content' instead of 'message'
        link: ''
    })

    const departments = ['CSE', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IT', 'MCA']
    const priorities = ['Normal', 'Important', 'Urgent']
    const categories = ['General', 'Funding Opportunity', 'Call for Papers', 'Journal Deadline', 'Conference', 'Policy Update']

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            // Fetch Notices (Announcements) instead of Notifications
            const [noticesRes, staffRes] = await Promise.all([
                API.get('/notices/all'),
                API.get('/admin/staff')
            ])
            setNotifications(noticesRes.data || [])
            setAllStaff(staffRes.data || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.title || !formData.content) {
            toast.error('Please fill in required fields')
            return
        }

        setSending(true)
        try {
            await API.post('/notices', formData)
            toast.success('Announcement published successfully!')
            setFormData({
                targetType: 'All',
                targetDepartment: '',
                targetUsers: [],
                priority: 'Normal',
                category: 'General',
                title: '',
                content: '',
                link: ''
            })
            fetchNotifications()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to publish announcement')
        } finally {
            setSending(false)
        }
    }

    const getPriorityBadge = (priority) => {
        const variants = {
            Normal: 'info',
            Important: 'warning',
            Urgent: 'danger'
        }
        return <Badge variant={variants[priority]}>{priority}</Badge>
    }

    return (
        <div className="space-y-6">
            {/* Compose Form */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-heading font-semibold text-gray-800 mb-4 tracking-tight">Create Targeted Announcement</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Target Audience</label>
                            <select
                                value={formData.targetType}
                                onChange={(e) => setFormData({ ...formData, targetType: e.target.value, targetDepartment: '', targetUsers: [] })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-green/20 outline-none transition-all"
                            >
                                <option value="All">All Staff Members</option>
                                <option value="Department">Specific Department</option>
                                <option value="Staff">Specific Individual Staff</option>
                            </select>
                        </div>

                        {formData.targetType === 'Department' && (
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Select Department</label>
                                <select
                                    value={formData.targetDepartment}
                                    onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                                >
                                    <option value="">Choose Department...</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}

                        {formData.targetType === 'Staff' && (
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Select Staff Member</label>
                                <select
                                    value={formData.targetUsers[0] || ''}
                                    onChange={(e) => setFormData({ ...formData, targetUsers: [e.target.value] })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                                >
                                    <option value="">Search Staff...</option>
                                    {allStaff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.department})</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Priority Level</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                            >
                                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Notice Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Announcement Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                                placeholder="e.g. Call for Papers - Journal of Science"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Announcement Content</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none"
                                rows={4}
                                placeholder="Write the detailed announcement here..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary-green animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Live Notice Board Sync Active</span>
                        </div>
                        <button
                            type="submit"
                            disabled={sending}
                            className="px-8 py-3 bg-primary-green text-white font-black uppercase text-sm rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 transition-all transform hover:-translate-y-1"
                        >
                            {sending ? 'Publishing...' : '📢 Publish Announcement'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sent Messages History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-heading font-black text-gray-800 uppercase tracking-tighter">Live Announcement Board</h2>
                    <Badge variant="info">{notifications.length} Active Notices</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">#</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Announcement</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Target</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Priority</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No messages sent yet</td>
                                </tr>
                            ) : (
                                notifications.map((notification, index) => (
                                    <tr key={notification._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800">{notification.title}</span>
                                                <span className="text-[10px] text-gray-400 capitalize">{notification.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {notification.targetType === 'All' ? '📢 All Staff' :
                                             notification.targetType === 'Department' ? `🏢 ${notification.targetDepartment}` :
                                             `👤 Single Staff`}
                                        </td>
                                        <td className="px-4 py-3">{getPriorityBadge(notification.priority)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </td>
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

export default SendMessages
