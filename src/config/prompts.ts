import clinicalConversationScene from '../assets/image.png';

/**
 * Configurable prompts and stimuli data for NeuroMind Assessment
 */

export interface SpeechPromptConfig {
  id: string;
  title: string;
  type: 'reading' | 'picture_description' | 'free_speech';
  instructions: string;
  content: string; // Passage text or Image description
  imageUrl?: string;
}

export const SPEECH_PROMPTS: SpeechPromptConfig[] = [
  {
    id: 'reading-passage-1',
    title: 'Standard Passage - Grandfather Story',
    type: 'reading',
    instructions: 'Please read the following passage aloud at a comfortable, natural pace.',
    content:
      'You wish to know all about my grandfather. Well, he is nearly ninety-three years old; he dresses himself in an ancient black frock coat, usually minus several buttons. A long beard hangs down to his waist, giving him a venerable look. When he speaks, his voice is a bit cracked and trembles just a little.',
  },
  {
    id: 'picture-description-clinical-conversation',
    title: 'Conversation Scene Description',
    type: 'picture_description',
    instructions: 'Please describe everything you see happening in this image in your own words.',
    content:
      'Describe the people, actions, objects, and setting shown in the conversation scene.',
    imageUrl: clinicalConversationScene,
  },
  {
    id: 'free-speech-morning-routine',
    title: 'Free Speech - Memorable Vacation',
    type: 'free_speech',
    instructions: 'Speak freely for 45 to 60 seconds about a memorable vacation or trip you took.',
    content: 'Describe where you went, who you were with, and what made it special.',
  },
];

export interface MemoryStimulus {
  id: string;
  name: string;
  category: 'animals' | 'objects' | 'nature' | 'household';
  svgIconName: string;
  color: string;
}

export const MEMORY_STIMULI: MemoryStimulus[] = [
  { id: 'mem-1', name: 'Anchor', category: 'objects', svgIconName: 'Anchor', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'mem-2', name: 'Bicycle', category: 'objects', svgIconName: 'Bike', color: 'bg-emerald-100 text-emerald-700 border-[#F29D88]' },
  { id: 'mem-3', name: 'Camera', category: 'objects', svgIconName: 'Camera', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'mem-4', name: 'Guitar', category: 'objects', svgIconName: 'Music', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'mem-5', name: 'Key', category: 'household', svgIconName: 'Key', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'mem-6', name: 'Lighthouse', category: 'nature', svgIconName: 'Compass', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { id: 'mem-7', name: 'Microscope', category: 'objects', svgIconName: 'Microscope', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'mem-8', name: 'Sailboat', category: 'objects', svgIconName: 'Ship', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { id: 'mem-9', name: 'Telescope', category: 'objects', svgIconName: 'Eye', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { id: 'mem-10', name: 'Watch', category: 'household', svgIconName: 'Watch', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

// Distractor items for the recognition grid task
export const MEMORY_DISTRACTORS: MemoryStimulus[] = [
  { id: 'dist-1', name: 'Book', category: 'objects', svgIconName: 'Book', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'dist-2', name: 'Globe', category: 'nature', svgIconName: 'Globe', color: 'bg-emerald-100 text-emerald-700 border-[#F29D88]' },
  { id: 'dist-3', name: 'Phone', category: 'household', svgIconName: 'Phone', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'dist-4', name: 'Sun', category: 'nature', svgIconName: 'Sun', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'dist-5', name: 'Umbrella', category: 'objects', svgIconName: 'Umbrella', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { id: 'dist-6', name: 'Scissors', category: 'household', svgIconName: 'Scissors', color: 'bg-red-100 text-red-700 border-red-300' },
];
