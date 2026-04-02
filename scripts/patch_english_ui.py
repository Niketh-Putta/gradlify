from pathlib import Path
import re

file_path = Path("src/pages/EnglishSplitViewDemo.tsx")
content = file_path.read_text()

# 1. Add supabase import
if "import { supabase }" not in content:
    content = content.replace("import { Button } from '@/components/ui/button';", "import { Button } from '@/components/ui/button';\nimport { supabase } from '@/integrations/supabase/client';")

# 2. Modify component to use useEffect and state for passages
state_hooks = """
  const diffParam = searchParams.get('difficulty');
  const subjectParam = searchParams.get('subject');

  const [dbSections, setDbSections] = useState<EnglishSection[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);

  useEffect(() => {
    const fetchPassages = async () => {
      try {
        let query = supabase.from('english_passages' as any).select('*');
        
        // Filter by difficulty if provided and not mixed
        if (diffParam && diffParam !== 'mixed') {
           query = query.eq('difficulty', parseInt(diffParam));
        }

        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
           const mapped: EnglishSection[] = data.map((row: any) => ({
             sectionId: row.sectionId,
             subEngine: row.subtopic,
             title: row.title || `SECTION: ${row.sectionId.toUpperCase()}`,
             icon: BookOpen,
             desc: row.desc || 'Read the text carefully and answer the following questions.',
             leftTitle: row.title || 'Practice Source',
             passageBlocks: row.passageBlocks || [],
             questions: row.questions || []
           }));
           setDbSections(mapped);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchPassages();
  }, [diffParam]);
"""

# Inject state hooks after const [isPremium, setIsPremium]
content = re.sub(r'(const \[isPremium, setIsPremium\] = useState<boolean>\(true\);.*?)\n', r'\1\n' + state_hooks, content)

# 3. Replace activeSections logic
memo_regex = r'const activeSections = useMemo\(\(\) => \{.*?\n  \}, \[examMode, mockConfig, practiceFocus, isPremium\]\);'

new_memo = """
  const activeSections = useMemo(() => {
    // Use DB data if available, otherwise fallback to hardcoded test data
    const sourceData = dbSections.length > 0 ? dbSections : [...TEST_DATA, VOCAB_PRACTICE];
    
    // Filter down to the user's requested topics in the URL
    const processedSections = examMode === 'mock' 
      ? sourceData 
      : sourceData.filter(sec => {
          if (practiceFocus === 'vocab') return sec.sectionId.toLowerCase() === 'vocabulary' || sec.subEngine === 'vocabulary' || sec.sectionId === 'vocab';
          if (practiceFocus === 'spag') return ['spelling', 'punctuation', 'grammar'].includes(sec.subEngine || sec.sectionId);
          return sec.sectionId === practiceFocus;
      });

    // We only take a handful for a practice session or mock so we don't load 150 passages onto one screen.
    // E.g., take 1 of each subtopic, or up to 5 total passages max.
    const limitedSections = processedSections.slice(0, 3); // For UI fluidity

    const sorted = limitedSections.map(sec => ({
      ...sec,
      questions: [...(sec.questions || [])].sort((a, b) => {
        if (a.evidenceLine === 'global') return 1;
        if (b.evidenceLine === 'global') return -1;
        const aNum = parseInt(a.evidenceLine.match(/\d+/)?.[0] || '0', 10);
        const bNum = parseInt(b.evidenceLine.match(/\d+/)?.[0] || '0', 10);
        return aNum - bNum;
      })
    }));

    if (examMode === 'practice' && !isPremium && sorted.length > 0) {
      return [{
        ...sorted[0],
        questions: sorted[0].questions.slice(0, 1)
      }];
    }

    return sorted;
  }, [examMode, mockConfig, practiceFocus, isPremium, dbSections]);
"""

content = re.sub(memo_regex, new_memo, content, flags=re.DOTALL)

file_path.write_text(content)
print("Updated EnglishSplitViewDemo!")
