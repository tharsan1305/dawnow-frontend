import { useState, useEffect } from 'react'
import { questionAPI } from '../../api'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { 
    Plus, 
    Edit2, 
    Trash2, 
    GripVertical, 
    Save, 
    X, 
    Eye, 
    ChevronUp, 
    ChevronDown, 
    FileText, 
    Activity, 
    Award, 
    BookOpen, 
    Settings,
    Clock,
    CheckCircle2,
    Lock
} from 'lucide-react'

const TaskQuestions = () => {
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('paper')
    const [modalOpen, setModalOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        section: 'paper',
        label: '',
        fieldType: 'text',
        placeholder: '',
        isRequired: false,
        options: [],
        order: 0
    })

    const [newOption, setNewOption] = useState('')

    // Section definitions
    const sections = [
        { id: 'paper', label: 'Paper', icon: <FileText size={18} />, title: 'Paper Work Load Details' },
        { id: 'project', label: 'Project', icon: <Activity size={18} />, title: 'Funded Project Work Load' },
        { id: 'patent', label: 'Patent', icon: <Award size={18} />, title: 'Patent Work Load' },
        { id: 'book', label: 'Book', icon: <BookOpen size={18} />, title: 'Book Writing Details' },
        { id: 'other', label: 'Other', icon: <Plus size={18} />, title: 'Other Research Activities' }
    ]

    const fieldTypes = [
        { value: 'text', label: 'Short Text' },
        { value: 'textarea', label: 'Long Paragraph' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
        { value: 'select', label: 'Dropdown' },
        { value: 'file', label: 'File Upload' },
        { value: 'mcq', label: 'Single Choice' },
        { value: 'checkbox', label: 'Multiple Choice' }
    ]

    useEffect(() => {
        fetchQuestions()
    }, [])

    const fetchQuestions = async () => {
        setLoading(true)
        try {
            const response = await questionAPI.getAll()
            setQuestions(response.questions || [])
        } catch (error) {
            console.error('Error fetching questions:', error)
            toast.error('Failed to load questions')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (question = null) => {
        if (question) {
            setEditingQuestion(question)
            setFormData({
                section: question.section,
                label: question.label,
                fieldType: question.fieldType,
                placeholder: question.placeholder || '',
                isRequired: question.isRequired,
                options: question.options || [],
                order: question.order
            })
        } else {
            const sectionQuestions = questions.filter(q => q.section === activeSection)
            setEditingQuestion(null)
            setFormData({
                section: activeSection,
                label: '',
                fieldType: 'text',
                placeholder: '',
                isRequired: false,
                options: [],
                order: sectionQuestions.length
            })
        }
        setNewOption('')
        setModalOpen(true)
    }

    const handleAddOption = () => {
        if (newOption.trim()) {
            setFormData(prev => ({
                ...prev,
                options: [...prev.options, newOption.trim()]
            }))
            setNewOption('')
        }
    }

    const handleRemoveOption = (index) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }))
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingQuestion) {
                await questionAPI.update(editingQuestion._id, formData)
                toast.success('Question updated successfully')
            } else {
                await questionAPI.create(formData)
                toast.success('Question added successfully')
            }
            setModalOpen(false)
            fetchQuestions()
        } catch (error) {
            toast.error(error.message || 'Failed to save question')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (question) => {
        if (question.isBuiltIn) {
            toast.error('Cannot delete built-in fields')
            return
        }

        if (!confirm(`Are you sure you want to delete "${question.label}"?`)) return

        try {
            await questionAPI.delete(question._id)
            toast.success('Question deleted successfully')
            fetchQuestions()
        } catch (error) {
            toast.error('Failed to delete question')
        }
    }

    const handleSeed = async () => {
        try {
            setLoading(true)
            await questionAPI.seed()
            toast.success('System fields synchronized successfully')
            fetchQuestions()
        } catch (err) {
            toast.error('Failed to sync system fields')
        } finally {
            setLoading(false)
        }
    }

    const handleReorder = async (direction, index, sectionQuestions) => {
        const newQuestions = [...sectionQuestions]
        if (direction === 'up' && index > 0) {
            [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]]
        } else if (direction === 'down' && index < newQuestions.length - 1) {
            [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]]
        } else {
            return
        }

        // Map and save
        const updates = newQuestions.map((q, i) => ({ _id: q._id, order: i }))
        try {
            await questionAPI.reorder(updates)
            fetchQuestions()
        } catch (error) {
            toast.error('Failed to update order')
        }
    }

    const currentSectionQuestions = questions
        .filter(q => q.section === activeSection)
        .sort((a, b) => a.order - b.order)

    const builtInFields = currentSectionQuestions.filter(q => q.isBuiltIn)
    const customFields = currentSectionQuestions.filter(q => !q.isBuiltIn)

    const renderPreviewField = (q) => {
        const commonStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm"
        
        switch (q.fieldType) {
            case 'textarea':
                return <textarea className={commonStyle} rows={3} placeholder={q.placeholder} disabled />
            case 'select':
            case 'mcq':
                return (
                    <select className={commonStyle} disabled>
                        <option>{q.placeholder || 'Select option...'}</option>
                        {q.options.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                )
            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {q.options.map(opt => (
                            <div key={opt} className="flex items-center gap-2">
                                <input type="checkbox" disabled />
                                <span className="text-sm text-gray-500">{opt}</span>
                            </div>
                        ))}
                    </div>
                )
            case 'yesno':
                return (
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2"><input type="radio" disabled /> <span className="text-sm">Yes</span></div>
                        <div className="flex items-center gap-2"><input type="radio" disabled /> <span className="text-sm">No</span></div>
                    </div>
                )
            default:
                return <input type={q.fieldType === 'number' ? 'number' : q.fieldType === 'date' ? 'date' : 'text'} className={commonStyle} placeholder={q.placeholder} disabled />
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Settings className="text-primary-green" /> Report Builder
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Customize the staff research entry form with dynamic fields</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleSeed}
                        title="Sync System Fields"
                        className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all border border-amber-200"
                    >
                        <Clock size={18} />
                    </button>
                    <button 
                        onClick={() => setPreviewOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
                    >
                        <Eye size={18} /> Preview Form
                    </button>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-green text-white font-bold rounded-lg hover:shadow-lg hover:shadow-green-100 transition-all"
                    >
                        <Plus size={18} /> Add Question
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-2">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            activeSection === s.id 
                            ? 'bg-primary-green text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        {s.icon} {s.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-gray-800">
                                    Selected Section: {sections.find(s => s.id === activeSection)?.title}
                                </h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Configure fields for this category</p>
                            </div>
                            <Badge variant="info" className="uppercase">{currentSectionQuestions.length} Fields</Badge>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Built-in Fields */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Lock size={14} className="text-amber-500" />
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest">Built-in Fields (Core system)</h3>
                            </div>
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="py-4 animate-pulse bg-gray-50 rounded-xl border border-dashed border-gray-200"></div>
                                ) : builtInFields.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No built-in fields for this section.</p>
                                ) : builtInFields.map((q, idx) => (
                                    <div key={q._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 grayscale opacity-80">
                                        <div className="flex items-center gap-4">
                                            <div className="text-gray-300"><GripVertical size={18} /></div>
                                            <div>
                                                <p className="font-bold text-gray-700 flex items-center gap-2">
                                                    📌 {q.label}
                                                    {q.isRequired && <span className="text-red-500">*</span>}
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500 font-bold uppercase">{q.fieldType}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Built-in</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded">LOCKED</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom Fields */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Plus size={14} className="text-primary-green" />
                                <h3 className="text-xs font-black text-primary-green uppercase tracking-widest">Custom Fields (Admin managed)</h3>
                            </div>
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="py-4 animate-pulse bg-gray-50 rounded-xl border border-dashed border-gray-200"></div>
                                ) : customFields.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No custom fields added yet</p>
                                        <button onClick={() => handleOpenModal()} className="mt-3 text-primary-green font-black text-xs hover:underline">+ ADD FIRST FIELD</button>
                                    </div>
                                ) : customFields.map((q, idx) => (
                                    <div key={q._id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary-green/30 hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => handleReorder('up', idx, customFields)}
                                                    disabled={idx === 0}
                                                    className="p-0.5 text-gray-300 hover:text-primary-green disabled:opacity-0"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <div className="text-slate-300 mx-auto"><GripVertical size={18} /></div>
                                                <button 
                                                    onClick={() => handleReorder('down', idx, customFields)}
                                                    disabled={idx === customFields.length - 1}
                                                    className="p-0.5 text-gray-300 hover:text-primary-green disabled:opacity-0"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 flex items-center gap-2">
                                                    ✏️ {q.label}
                                                    {q.isRequired && <span className="text-red-500">*</span>}
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-primary-green/5 px-2 py-0.5 rounded border border-primary-green/10 text-primary-green font-bold uppercase">{q.fieldType}</span>
                                                    {q.options && q.options.length > 0 && (
                                                        <span className="text-[10px] text-gray-400 font-bold">{q.options.length} Options</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleOpenModal(q)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(q)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-6 border-t border-gray-50">
                            <button 
                                onClick={() => handleOpenModal()}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-sm hover:bg-gray-50 hover:border-primary-green hover:text-primary-green transition-all"
                            >
                                + ADD NEW QUESTION TO THIS SECTION
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingQuestion ? 'Edit Question' : 'Add New Question'}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-5 p-1">
                    <div className="grid grid-cols-1 gap-5">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Section</label>
                            <div className="grid grid-cols-3 gap-2">
                                {sections.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setFormData({...formData, section: s.id})}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                                            formData.section === s.id 
                                            ? 'bg-primary-green text-white border-primary-green' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-primary-green'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Question Label</label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-green/5 focus:border-primary-green outline-none font-medium text-sm transition-all"
                                placeholder="e.g. 'Number of Authors'"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Field Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {fieldTypes.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setFormData({...formData, fieldType: t.value})}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all ${
                                            formData.fieldType === t.value 
                                            ? 'bg-primary-green/5 text-primary-green border-primary-green' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className={`inline-block w-4 h-4 rounded-full border-4 mr-2 align-middle ${formData.fieldType === t.value ? 'border-primary-green' : 'border-gray-200'}`}></span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {['select', 'mcq', 'checkbox'].includes(formData.fieldType) && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Options</label>
                                <div className="space-y-2 mb-3">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="flex-1 text-sm font-medium">{opt}</span>
                                            <button type="button" onClick={() => handleRemoveOption(idx)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newOption}
                                        onChange={(e) => setNewOption(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                        placeholder="Add option..."
                                    />
                                    <button type="button" onClick={handleAddOption} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all">ADD</button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Placeholder / Help Text</label>
                            <input
                                type="text"
                                value={formData.placeholder}
                                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-green/5 focus:border-primary-green outline-none font-medium text-sm transition-all"
                                placeholder="Instructions for staff user"
                            />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                           <div className="relative">
                               <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={formData.isRequired} 
                                    onChange={() => setFormData({...formData, isRequired: !formData.isRequired})}
                                />
                               <div className={`w-10 h-6 rounded-full transition-colors ${formData.isRequired ? 'bg-primary-green' : 'bg-gray-200'}`}></div>
                               <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.isRequired ? 'translate-x-4' : 'translate-x-0'}`}></div>
                           </div>
                           <span className="text-sm font-bold text-gray-600 group-hover:text-gray-800 transition-colors">Required field</span>
                        </label>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                        {editingQuestion && (
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Last edited: {new Date(editingQuestion.updatedAt).toLocaleDateString()}</p>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-2.5 bg-primary-green text-white font-bold rounded-xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Question'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title="👁️ Form Preview (Staff View)"
                size="xl"
            >
                <div className="bg-[#f8fafc] p-6 rounded-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="bg-primary-green p-8 text-white">
                            <h2 className="text-2xl font-black">{sections.find(s=>s.id === activeSection)?.title}</h2>
                            <p className="text-sm opacity-80 mt-2 font-medium">This is how researchers will see this section</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {currentSectionQuestions.length === 0 ? (
                                    <div className="col-span-2 text-center py-20 text-slate-300 font-bold uppercase tracking-widest">
                                        No fields configured for this section
                                    </div>
                                ) : currentSectionQuestions.map(q => (
                                    <div key={q._id} className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                            {q.label} {q.isRequired && <span className="text-red-500">*</span>}
                                            {q.isBuiltIn && <Badge variant="info" className="scale-75 origin-left">Built-in</Badge>}
                                        </label>
                                        {renderPreviewField(q)}
                                        {q.placeholder && <p className="text-[10px] text-slate-400 italic">Help: {q.placeholder}</p>}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-8 border-t border-slate-100 flex justify-end">
                                <button className="px-10 py-3 bg-primary-green text-white font-black rounded-2xl shadow-xl shadow-green-100 opacity-50 cursor-not-allowed">
                                    SUBMIT PREVIEW
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-center">
                    <button onClick={()=>setPreviewOpen(false)} className="text-slate-400 font-bold hover:text-slate-600 flex items-center gap-2">
                        <X size={16}/> Close Preview
                    </button>
                </div>
            </Modal>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    )
}

export default TaskQuestions
