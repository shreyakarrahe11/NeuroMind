import React, { useState } from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { Edit3, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PatientInfoForm: React.FC = () => {
  const { session, updatePatientInfo } = useAssessment();
  const { patientInfo } = session;
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    updatePatientInfo({ [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-[#FDF8F5] p-6 rounded-[2rem] space-y-4 mb-8 border border-[#F9EFEA]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#4A2333]">Patient Information</h2>
          <p className="text-sm text-slate-500">Please provide patient details for the report.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
            isEditing
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          {isEditing ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Info</span>
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              <span>Edit Info</span>
            </>
          )}
        </motion.button>
      </div>
      
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#F9EFEA] overflow-hidden"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input 
                type="text" 
                name="name" 
                value={patientInfo.name} 
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white transition-shadow focus:ring-2 focus:ring-[#F29D88] focus:border-transparent outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Age</label>
              <input 
                type="number" 
                name="age" 
                value={patientInfo.age} 
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white transition-shadow focus:ring-2 focus:ring-[#F29D88] focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Gender</label>
              <select 
                name="gender" 
                value={patientInfo.gender} 
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white transition-shadow focus:ring-2 focus:ring-[#F29D88] focus:border-transparent outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Education</label>
              <input 
                type="text" 
                name="education" 
                value={patientInfo.education} 
                onChange={handleChange}
                placeholder="e.g. Bachelor's Degree"
                className="w-full p-3 rounded-xl border border-slate-200 bg-white transition-shadow focus:ring-2 focus:ring-[#F29D88] focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Occupation</label>
              <input 
                type="text" 
                name="occupation" 
                value={patientInfo.occupation} 
                onChange={handleChange}
                placeholder="e.g. Retired Teacher"
                className="w-full p-3 rounded-xl border border-slate-200 bg-white transition-shadow focus:ring-2 focus:ring-[#F29D88] focus:border-transparent outline-none"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="viewing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-[#F9EFEA] overflow-hidden"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</span>
              <p className="text-base font-semibold text-slate-900">{patientInfo.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Age</span>
              <p className="text-base font-semibold text-slate-900">{patientInfo.age || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</span>
              <p className="text-base font-semibold text-slate-900">{patientInfo.gender || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Education</span>
              <p className="text-base font-semibold text-slate-900">{patientInfo.education || '-'}</p>
            </div>
            <div className="space-y-1 md:col-span-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupation</span>
              <p className="text-base font-semibold text-slate-900">{patientInfo.occupation || '-'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
