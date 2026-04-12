import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { staffAPI } from '../../api'
import Badge from '../../components/ui/Badge'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const ViewReport = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [fromDate, setFromDate] = useState(null)
    const [toDate, setToDate] = useState(null)
    const [statusFilter, setStatusFilter] = useState('All')
    const [typeFilter, setTypeFilter] = useState('All')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalResults, setTotalResults] = useState(0)

    const fetchTasks = async () => {
        setLoading(true)
        try {
            const params = {
                page,
                limit: 10
            }
            if (fromDate) params.from = fromDate.toISOString()
            if (toDate) params.to = toDate.toISOString()
            if (statusFilter !== 'All') params.status = statusFilter
            if (typeFilter !== 'All') params.type = typeFilter

            const response = await staffAPI.getTasks(params)
            setTasks(response?.tasks || [])
            setTotalPages(response?.totalPages || 1)
            setTotalResults(response?.total || 0)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [page, fromDate, toDate, statusFilter, typeFilter])

    // Technical Error Residues Filter
    const cleanText = (text) => {
        if (!text) return 'N/A';
        const errorPatterns = [
            /ReferenceError:/gi,
            /is not defined/gi,
            /undefined/gi,
            /\[object Object\]/gi,
            /null/gi
        ];
        let cleaned = text;
        errorPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        return cleaned.trim() || 'Research Activity Log';
    };

    const handleDownloadPDF = () => {
        // Simple PDF export using standard library
        import('jspdf').then(({ default: jsPDF }) => {
            import('jspdf-autotable').then(({ default: autoTable }) => {
                const doc = new jsPDF()
                doc.setFontSize(16)
                doc.text('My Research Activity Report', 14, 15)
                doc.setFontSize(10)
                doc.text(`User: ${user?.name || 'Staff Member'}`, 14, 22)
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27)

                const tableData = tasks.map((t, i) => [
                    i + 1,
                    new Date(t.date).toLocaleDateString(),
                    cleanText(t.paperTitle || t.projectName || t.patentTitle || t.bookTitle || t.activityTitle),
                    t.paperTitle ? 'Paper' : t.projectName ? 'Project' : t.patentTitle ? 'Patent' : t.bookTitle ? 'Book' : 'Activity',
                    t.status.toUpperCase()
                ])

                autoTable(doc, {
                    startY: 35,
                    head: [['#', 'Date', 'Title', 'Type', 'Status']],
                    body: tableData,
                })

                doc.save(`My_Report_${new Date().toISOString().split('T')[0]}.pdf`)
            })
        })
    }

    const handleEdit = (task) => {
        navigate('/staff/task-entry', { state: { editTaskId: task._id } })
    }

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'pending',
            approved: 'approved',
            Completed: 'approved',
            rejected: 'rejected'
        }
        const label = status === 'approved' ? 'Completed' : status
        return <Badge variant={variants[status]}>{label}</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h1 className="text-2xl font-heading font-bold text-gray-800 mb-4">View Reports</h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">From Date</label>
                        <DatePicker
                            selected={fromDate}
                            onChange={setFromDate}
                            selectsStart
                            startDate={fromDate}
                            endDate={toDate}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholderText="From"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">To Date</label>
                        <DatePicker
                            selected={toDate}
                            onChange={setToDate}
                            selectsEnd
                            startDate={fromDate}
                            endDate={toDate}
                            minDate={fromDate}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholderText="To"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Status</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg h-[42px] bg-white outline-none"
                        >
                            <option value="All">All Status</option>
                            <option value="Completed">Completed</option>
                            <option value="pending">In Review</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Activity Type</label>
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg h-[42px] bg-white outline-none"
                        >
                            <option value="All">All Types</option>
                            <option value="Paper">Paper</option>
                            <option value="Project">Project</option>
                            <option value="Patent">Patent</option>
                            <option value="Book">Book</option>
                            <option value="General">General Activity</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => { setFromDate(null); setToDate(null); setStatusFilter('All'); setTypeFilter('All') }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-t border-gray-50">
                    <p className="text-sm font-medium text-slate-500">
                        Showing <span className="text-primary-green font-bold">{tasks.length}</span> of {totalResults} reports
                    </p>
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={tasks.length === 0}
                        className="px-6 py-2 bg-primary-green text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                        📄 Export My Reports (PDF)
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Research Activity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : tasks.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No tasks found</td>
                                </tr>
                            ) : (
                                tasks.map((task, index) => (
                                    <tr key={task._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">{(page - 1) * 10 + index + 1}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(task.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">
                                                    {cleanText(task.paperTitle || task.projectName || task.patentTitle || task.bookTitle || task.activityTitle)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {task.paperTitle ? 'Paper' : 
                                                     task.projectName ? 'Project' : 
                                                     task.patentTitle ? 'Patent' : 
                                                     task.bookTitle ? 'Book' : 
                                                     task.activityTitle ? 'Activity' : 'General'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(task.status)}</td>
                                        <td className="px-4 py-3">
                                            {(task.status === 'Completed' || task.status === 'approved') ? (
                                                <span className="text-xs text-gray-400 italic">Submitted – locked</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(task)}
                                                    className="text-primary-green hover:underline text-sm font-medium"
                                                >
                                                    ✏️ Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}

export default ViewReport
