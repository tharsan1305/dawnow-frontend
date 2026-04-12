import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import API from '../../api/axios'
import Badge from '../../components/ui/Badge'

const Informative = () => {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)

    const cleanText = (text) => {
        if (!text) return '';
        const errorPatterns = [/ReferenceError:/gi, /is not defined/gi, /undefined/gi, /\[object Object\]/gi, /null/gi];
        let cleaned = text;
        errorPatterns.forEach(pattern => { cleaned = cleaned.replace(pattern, ''); });
        return cleaned.trim();
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await API.get('/staff/notifications')
                setNotifications(Array.isArray(response.data) ? response.data : [])
            } catch (error) {
                console.error('Error fetching notifications:', error)
                setNotifications([])
            } finally {
                setLoading(false)
            }
        }

        fetchNotifications()
    }, [])

    const handleMarkAsRead = async (id) => {
        try {
            await API.put(`/staff/notifications/${id}/read`) // Fixed to PUT to match routes
            setNotifications(prev =>
                prev.map(n =>
                    n._id === id
                        ? { ...n, readBy: [...(n.readBy || []), user?._id] }
                        : n
                )
            )
        } catch (error) {
            console.error('Error marking as read:', error)
        }
    }

    const isRead = (notification) => {
        return notification.readBy?.includes(user?._id)
    }

    const getPriorityBadge = (priority) => {
        const variants = {
            Normal: 'info',
            High: 'warning',
            Urgent: 'danger'
        }
        return <Badge variant={variants[priority]}>{priority}</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h1 className="text-2xl font-heading font-bold text-gray-800 mb-4">Informative Messages</h1>

                {loading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-green border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 text-sm font-bold uppercase tracking-widest">Checking Communications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No notifications recorded yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification._id}
                                onClick={() => !isRead(notification) && handleMarkAsRead(notification._id)}
                                className={`p-5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${isRead(notification)
                                        ? 'bg-white border-gray-100 opacity-75'
                                        : 'bg-green-50/50 border-green-200 hover:border-green-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-gray-800 tracking-tight">
                                                {cleanText(notification.title) || 'Communication Update'}
                                            </h3>
                                            {getPriorityBadge(notification.priority)}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {cleanText(notification.message) || 'No message content provided.'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest">
                                            📅 {new Date(notification.createdAt).toLocaleString()} • 🛡️ Sent to: {notification.sentTo}
                                        </p>
                                    </div>
                                    {!isRead(notification) && (
                                        <div className="w-2.5 h-2.5 bg-primary-green rounded-full flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(22,163,74,0.5)] animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Informative
