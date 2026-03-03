import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Mail, MessageSquare, Tag, Type, Calendar, ArrowLeft } from "lucide-react";

interface Inquiry {
    id: number;
    design_text: string;
    hat_style: string;
    contact: string;
    story: string;
    selections: any;
    created_at: string;
}


export default function ContactList({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/inquiries")
            .then((res) => res.json())
            .then((data) => {
                setInquiries(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch inquiries:", error);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={onBack}
                        className="flex items-center text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        返回首页
                    </motion.button>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-3xl font-bold text-zinc-900 tracking-tight"
                    >
                        联系列表 <span className="text-emerald-600">({inquiries.length})</span>
                    </motion.h1>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-lg shadow-zinc-100/50">
                        <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-900">暂无数据</h3>
                        <p className="text-zinc-500 mt-2">目前还没有用户提交任何联系信息。</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {inquiries.map((inquiry, index) => (
                            <motion.div
                                key={inquiry.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-zinc-100/80 transition-all group"
                            >
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center bg-emerald-50 px-3 py-1.5 rounded-full">
                                            <Tag className="h-3.5 w-3.5 text-emerald-600 mr-2" />
                                            <span className="text-sm font-semibold text-emerald-700">{inquiry.hat_style}</span>
                                        </div>
                                        <div className="flex items-center text-zinc-400 text-sm">
                                            <Calendar className="h-3.5 w-3.5 mr-2" />
                                            {new Date(inquiry.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-start">
                                                <div className="bg-zinc-50 p-2 rounded-lg mt-0.5 mr-4">
                                                    <Type className="h-5 w-5 text-zinc-400" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">设计文本</label>
                                                    <p className="text-zinc-900 font-medium leading-relaxed">{inquiry.design_text}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start">
                                                <div className="bg-zinc-50 p-2 rounded-lg mt-0.5 mr-4">
                                                    <Mail className="h-5 w-5 text-zinc-400" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">联系方式</label>
                                                    <p className="text-zinc-900 font-medium leading-relaxed">{inquiry.contact}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start border-t md:border-t-0 md:border-l border-zinc-100 pt-6 md:pt-0 md:pl-8">
                                            <div className="bg-zinc-50 p-2 rounded-lg mt-0.5 mr-4">
                                                <MessageSquare className="h-5 w-5 text-zinc-400" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">定制说明 / 故事</label>
                                                <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap italic">
                                                    {inquiry.story || "未提供额外说明"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {inquiry.selections && (
                                        <div className="mt-8 pt-6 border-t border-zinc-100">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-4">Design Details</label>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(inquiry.selections).map(([key, value]) => {
                                                    if (typeof value !== 'string' || value.startsWith('bg-')) return null;
                                                    return (
                                                        <span key={key} className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-xs font-medium">
                                                            <span className="text-zinc-400 mr-1">{key}:</span> {value}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>


                                <div className="px-8 py-3 bg-zinc-50/50 border-t border-zinc-100 flex justify-end group-hover:bg-emerald-50/10 transition-colors">
                                    <span className="text-[10px] font-mono text-zinc-300">ID: #{inquiry.id.toString().padStart(4, '0')}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
