import React, { createContext, useCallback, useEffect, useState } from 'react'

export type Language = 'en' | 'sw'

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

// Load translations
const loadTranslations = async (): Promise<Record<string, any>> => {
  try {
    const enRes = await fetch('/i18n/locales/en.json')
    const swRes = await fetch('/i18n/locales/sw.json')
    const [en, sw] = await Promise.all([enRes.json(), swRes.json()])
    return { en, sw }
  } catch (error) {
    console.error('Failed to load translations:', error)
    return { en: {}, sw: {} }
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Record<string, any>>({})
  const [language, setLanguage] = useState<Language>('en')

  // Initialize language from localStorage or default to English
  useEffect(() => {
    const loadLang = async () => {
      const savedLang = localStorage.getItem('language') as Language
      if (savedLang === 'en' || savedLang === 'sw') {
        setLanguage(savedLang)
      }
      const trans = await loadTranslations()
      setTranslations(trans)
    }
    loadLang()
  }, [])

  // Save language preference when it changes
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const setLanguageWrapper = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  // Translation function with fallback to key if translation not found
  const t = useCallback((key: string): string => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as any)[k]
      } else {
        // Return the key itself if translation not found
        return key
      }
    }
    
    return typeof value === 'string' ? value : key
  }, [language, translations])

  const value = useMemo(() => ({
    language,
    setLanguage: setLanguageWrapper,
    t
  }), [language, setLanguageWrapper, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = (): LanguageContextValue => {
  const ctx = React.useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}