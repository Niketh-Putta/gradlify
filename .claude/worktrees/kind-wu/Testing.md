# Testing Mode Guide

## How to Enable Testing Mode

1. Set environment variable: `VITE_TESTING_MODE=true`
2. Restart the development server
3. Testing mode badge will appear in the navigation

## What Testing Mode Does

- **Bypasses Premium Checks**: All AI chat, mock exams, and planner features work without limits
- **Hides Upgrade Prompts**: Premium CTAs and upgrade modals are disabled
- **Shows Usage Counters**: Daily usage is still tracked but not enforced
- **Testing Banner**: Yellow banner appears when limits would normally be hit

## Testing Checklist

### Study Planner
- [ ] Create a study plan with different times per day (Mon-Sun time windows)
- [ ] Sessions appear on the weekly grid
- [ ] Mark sessions as Done/Skip and see status updates
- [ ] Edit session times by dragging (if implemented)
- [ ] No "failed to load/generate" errors

### Mock Exams
- [ ] Start mini mock (10 questions, mixed topics)
- [ ] Start topic-focused mock (select specific topics)
- [ ] Answer questions with LaTeX rendering working
- [ ] Submit and see results with topic breakdown
- [ ] Attempts saved to database

### AI Chat
- [ ] Send unlimited messages without premium blocks
- [ ] Chat history persists and shows on Home dashboard
- [ ] Math rendering works with LaTeX (use $ symbols)
- [ ] New chat threads created automatically

### Database Tables
Check Supabase for these tables:
- `study_sessions` - Study planner data
- `mock_attempts` - Mock exam attempts
- `mock_questions` - Individual questions and answers
- `chat_sessions` - Chat thread metadata
- `chat_messages` - Individual chat messages

### RLS Policies
All tables should have Row Level Security enabled with user-scoped policies using `auth.uid() = user_id`.

## Environment Variables

```
VITE_TESTING_MODE=true
```

## Disabling Testing Mode

1. Remove or set `VITE_TESTING_MODE=false`
2. Restart development server
3. Normal premium checks will resume