import React, { createContext, useContext, useState, useEffect } from 'react';

type Subject = 'maths' | 'english';

interface SubjectContextType {
  currentSubject: Subject;
  setSubject: (subject: Subject) => void;
}

const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

export const SubjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSubject, setCurrentSubjectState] = useState<Subject>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('gradlify_preferred_subject');
    return (saved === 'english' || saved === 'maths') ? saved : 'maths';
  });

  useEffect(() => {
    // Apply a global class for styling overrides based on the subject (e.g., turning gradients blue instead of orange)
    if (currentSubject === 'english') {
      document.body.classList.add('theme-english');
      document.body.classList.remove('theme-maths');
    } else {
      document.body.classList.add('theme-maths');
      document.body.classList.remove('theme-english');
    }
    localStorage.setItem('gradlify_preferred_subject', currentSubject);
  }, [currentSubject]);

  const setSubject = (subject: Subject) => {
    setCurrentSubjectState(subject);
  };

  return (
    <SubjectContext.Provider value={{ currentSubject, setSubject }}>
      {children}
    </SubjectContext.Provider>
  );
};

export const useSubject = () => {
  const context = useContext(SubjectContext);
  if (context === undefined) {
    throw new Error('useSubject must be used within a SubjectProvider');
  }
  return context;
};
