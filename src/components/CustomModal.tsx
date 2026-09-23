import type { CustomModalState } from '../types';

interface CustomModalProps {
  modal: CustomModalState;
  onClose: () => void;
}

export default function CustomModal({ modal, onClose }: CustomModalProps) {
  if (!modal.isOpen) return null;

  const handleConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    onClose();
  };

  const getTypeColor = () => {
    switch (modal.type) {
      case 'success':
        return {
          icon: 'check_circle',
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'warning':
        return {
          icon: 'warning',
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          btn: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
        };
      case 'error':
        return {
          icon: 'error',
          bg: 'bg-rose-100',
          text: 'text-rose-700',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'info':
      default:
        return {
          icon: 'info',
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          btn: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const style = getTypeColor();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
            <span className="material-symbols-outlined text-[26px]">{style.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold leading-snug">
              {modal.title}
            </h3>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-slate-600 leading-relaxed">
          {modal.message}
        </p>

        {modal.details && modal.details.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
            {modal.details.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-700 font-body-sm">
                <span className="text-slate-500 font-medium">{item.label}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className={`w-full h-11 rounded-xl font-label-md text-label-md font-bold uppercase transition-all shadow-sm cursor-pointer ${style.btn}`}
          >
            {modal.confirmText || 'OK / Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
