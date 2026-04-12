import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import {
    LayoutDashboard,
    FileText,
    Users,
    HelpCircle,
    Key,
    Bell,
    CheckSquare,
    LineChart,
    LogOut,
    Menu,
    X,
    ChevronRight,
    GraduationCap,
    PlusCircle,
    FolderOpen,
    BarChart3,
    Settings,
    UserX,
    MessageSquare
} from 'lucide-react'

import Header from './ui/Header'
import Footer from './Footer'
import { socket, connectSocket, disconnectSocket } from '../socket'

const AdminLayout = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [pendingPwdRequests, setPendingPwdRequests] = useState(0)
    const [unreadChats, setUnreadChats] = useState(0)

    useEffect(() => {
        if (user) {
            connectSocket('admin', { userId: user._id })
        }

        return () => {
            disconnectSocket()
        }
    }, [])

    useEffect(() => {
        const fetchPendingPwdRequests = async () => {
            try {
                const response = await API.get('/admin/pwd-requests?status=pending')
                setPendingPwdRequests(response?.data?.length || 0)
            } catch (error) {
                console.error('Error fetching password requests:', error)
            }
        }

        fetchPendingPwdRequests()
        const interval = setInterval(fetchPendingPwdRequests, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const fetchUnreadChats = async () => {
            try {
                const response = await API.get('/messages/unread/count')
                setUnreadChats(response?.data?.count || 0)
            } catch (error) {
                console.error('Error fetching unread chats:', error)
            }
        }

        fetchUnreadChats()
        const interval = setInterval(fetchUnreadChats, 15000)
        
        // Listen for new messages via socket
        socket.on('new_message', fetchUnreadChats)
        
        return () => {
            clearInterval(interval)
            socket.off('new_message')
        }
    }, [])

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { path: '/admin/daily-status', icon: UserX, label: 'Absent List' },
        { path: '/admin/analytics', icon: LineChart, label: 'Analytics' },
        { path: '/admin/reports', icon: FileText, label: 'Staff Reports' },
        { path: '/admin/staff', icon: Users, label: 'Manage Staff' },
        { path: '/admin/questions', icon: HelpCircle, label: 'Report Builder' },
        { path: '/admin/pwd-requests', icon: Key, label: 'Security', badge: pendingPwdRequests },
        { path: '/admin/broadcast', icon: Bell, label: 'Broadcast' },
        { path: '/admin/chat', icon: MessageSquare, label: 'Messages', badge: unreadChats },
        { path: '/admin/settings', icon: Settings, label: 'System Settings' },
    ]



    const handleLogout = () => {
        disconnectSocket()
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-primary-green min-h-screen transition-all duration-300 fixed left-0 top-0 z-30`}
            >
                <div className="flex flex-col h-full">
                    {/* Spacer for fixed header */}
                    <div className="h-20"></div>

                    {/* Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute -right-3 top-20 bg-white rounded-full p-1 shadow-md"
                    >
                        {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4">
                        {/* CFRD Section */}
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${isActive
                                        ? 'bg-green-800 text-white'
                                        : 'text-white/80 hover:bg-green-700'
                                    }`
                                }
                            >
                                <item.icon size={20} />
                                {sidebarOpen && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge > 0 && (
                                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}


                    </nav>

                    {/* User Info */}
                    <div className="p-4 border-t border-green-700">
                        {sidebarOpen ? (
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-green font-bold">
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                                    <p className="text-white/60 text-xs capitalize">{user?.role}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-green font-bold mx-auto mb-3">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-2 text-white/80 hover:text-white hover:bg-green-700 w-full px-4 py-2 rounded-lg transition-colors ${sidebarOpen ? '' : 'justify-center'}`}
                        >
                            <LogOut size={18} />
                            {sidebarOpen && <span>Log Out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Header Component */}
            <Header />

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'} pt-20`}>
                <div className="flex flex-col min-h-[calc(100vh-5rem)]">
                    {/* Page Content */}
                    <div className="p-6 flex-1">
                        <Outlet />
                    </div>
                    {/* Footer */}
                    <Footer />
                </div>
            </main>
        </div>
    )
}

export default AdminLayout
