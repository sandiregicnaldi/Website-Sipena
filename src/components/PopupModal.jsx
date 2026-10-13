import React from 'react';

export default function PopupModal({ isOpen, type = 'error', title, message, onClose, onConfirm, confirmText }) {
    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`p-6 flex flex-col items-center text-center ${isSuccess ? 'bg-[#eef4fc]' : 'bg-rose-50'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isSuccess ? 'bg-[#1c51a1] text-white shadow-lg shadow-[#1c51a1]/30' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'}`}>
                        <span className="material-symbols-outlined text-[32px]">
                            {isSuccess ? 'check_circle' : 'error'}
                        </span>
                    </div>
                    <h3 className={`text-xl font-black tracking-tight mb-2 ${isSuccess ? 'text-[#1c51a1]' : 'text-rose-700'}`}>
                        {title || (isSuccess ? 'Berhasil!' : 'Terjadi Kesalahan')}
                    </h3>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                    {onConfirm && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        onClick={onConfirm || onClose}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                            isSuccess
                                ? 'bg-[#1c51a1] text-white hover:bg-[#163d7a] shadow-md shadow-[#1c51a1]/20'
                                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20'
                        }`}
                    >
                        {confirmText || (isSuccess ? 'Lanjutkan' : 'Mengerti')}
                    </button>
                </div>
            </div>
        </div>
    );
}
