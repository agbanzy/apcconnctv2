import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, Translations } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "apc-language";
const VALID_LANGUAGES: Language[] = ["en", "ig", "ha", "yo"];

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_LANGUAGES.includes(saved as Language)) {
      return saved as Language;
    }
  } catch (error) {
    console.warn("Failed to read language preference from localStorage:", error);
  }
  
  return "en";
}

function saveLanguage(lang: Language): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    console.warn("Failed to save language preference to localStorage:", error);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const storedLang = getStoredLanguage();
    setLanguageState(storedLang);
  }, []);

  const setLanguage = (lang: Language) => {
    if (!VALID_LANGUAGES.includes(lang)) {
      console.warn(`Invalid language: ${lang}, falling back to English`);
      lang = "en";
    }
    setLanguageState(lang);
    saveLanguage(lang);
  };

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
