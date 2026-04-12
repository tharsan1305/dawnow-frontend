import { useState, useEffect } from 'react'
import API from '../../api/axios'
import { Search, Filter, UserX, UserCheck, RefreshCw, FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api'
import Badge from '../../components/ui/Badge'

const DailyStatus = () => {
    const [statusData, setStatusData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [deptFilter, setDeptFilter] = useState('All')
    const [view, setView] = useState('all') // 'all', 'submitted', 'absent'

    const departments = ['CSE', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IT', 'MCA']

    const fetchStatus = async () => {
        setLoading(true)
        try {
            const data = await adminAPI.getTodayStatus()
            
            // Handle both old and new response formats for maximum compatibility
            const normalizedData = {
                summary: {
                    total: data.totalStaff || data.summary?.total || (Array.isArray(data.allStaff) ? data.allStaff.length : 0) || 0,
                    submitted: data.submittedCount || (Array.isArray(data.submitted) ? data.submitted.length : 0) || data.summary?.submitted || 0,
                    absent: data.absentCount || (Array.isArray(data.absent) ? data.absent.length : 0) || data.summary?.absent || 0
                },
                submitted: data.submittedList || (Array.isArray(data.submitted) ? data.submitted : []),
                absent: data.absentList || (Array.isArray(data.absent) ? data.absent : [])
            }
            
            setStatusData(normalizedData)
        } catch (error) {
            console.error('Error fetching today status:', error)
            toast.error('Failed to load today\'s status')
            // Fallback to empty state with 0s to prevent null reference errors
            setStatusData({
                summary: { total: 0, submitted: 0, absent: 0 },
                submitted: [],
                absent: []
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    const getFilteredList = () => {
        if (!statusData) return []
        
        let list = []
        if (view === 'all') {
            list = [...statusData.submitted, ...statusData.absent.map(s => ({ ...s, status: 'absent' }))]
        } else if (view === 'submitted') {
            list = statusData.submitted
        } else {
            list = statusData.absent.map(s => ({ ...s, status: 'absent' }))
        }

        return list.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (item.staffId && item.staffId.toLowerCase().includes(searchQuery.toLowerCase()))
            const matchesDept = deptFilter === 'All' || item.department === deptFilter
            return matchesSearch && matchesDept
        })
    }

    const filteredList = getFilteredList()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-800">Daily Submission Status</h1>
                    <p className="text-sm text-gray-500 mt-1">Today's report submission tracking ({new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })})</p>
                </div>
                <button
                    onClick={fetchStatus}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-green text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Staff</p>
                        <p className="text-2xl font-bold text-gray-800">{statusData?.summary.total || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Submitted</p>
                        <p className="text-2xl font-bold text-green-600">{statusData?.summary.submitted || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <UserX size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Absent (No Report)</p>
                        <p className="text-2xl font-bold text-red-600">{statusData?.summary.absent || 0}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or Staff ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green outline-none"
                        >
                            <option value="All">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setView('all')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'all' ? 'bg-primary-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setView('submitted')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'submitted' ? 'bg-primary-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                Submitted
                            </button>
                            <button
                                onClick={() => setView('absent')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'absent' ? 'bg-primary-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                Absent
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Details</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submission</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="4" className="px-6 py-4 h-16 bg-gray-50/50"></td>
                                </tr>
                            ))
                        ) : filteredList.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                    No staff found matching the criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredList.map((staff) => (
                                <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-primary-green font-bold">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{staff.name}</p>
                                                <p className="text-xs text-gray-500">{staff.staffId || staff.designation}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-gray-600">{staff.department}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {staff.status === 'absent' ? (
                                            <Badge variant="danger">❌ Absent</Badge>
                                        ) : staff.status === 'approved' ? (
                                            <Badge variant="success">✅ Approved</Badge>
                                        ) : (
                                            <Badge variant="warning">🟡 Pending</Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold ${staff.status === 'absent' ? 'text-gray-400' : 'text-primary-green'}`}>
                                            {staff.status === 'absent' ? 'Not Submitted' : 'Uploaded'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default DailyStatus
