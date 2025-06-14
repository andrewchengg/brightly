# Weekly Quest Ideas Collection

This file contains all the weekly quest ideas discussed and implemented for the learning platform.

## Core Weekly Quests (Your Original Ideas)
1. **Earn X XP** - Amount rises moderately as level rises (Base: 100 XP + 25 per level)
2. **Score 80% or higher in X practice sessions** - Amount rises modestly as level rises (Base: 3 + 0.5 per level)
3. **Review X mistakes** - Keep constant at 10 mistakes

## Subject Mastery Quests
4. **Master Multiple Subjects** - Complete at least 1 practice session in 3 different subjects
5. **Subject Specialist** - Complete 5+ practice sessions in your chosen subject specialty
6. **Cross-Subject Explorer** - Try a new subject you haven't practiced this week

## Consistency & Streak Quests
7. **Weekly Warrior** - Practice for at least 5 days this week
8. **Consistent Learner** - Complete at least 2 practice sessions on 4 different days
9. **Perfect Week** - Practice every day of the week (7 days)

## Challenge & Difficulty Quests
10. **Rising Star** - Complete 3 practice sessions with increasing difficulty levels
11. **Challenge Seeker** - Complete 2 "Random Practice" sessions
12. **Topic Explorer** - Complete practice sessions from 5 different topics

## Performance & Achievement Quests
13. **Accuracy Champion** - Maintain 85%+ average accuracy across all sessions this week
14. **Speed Demon** - Complete 10 practice sessions within the week
15. **Perfectionist** - Score 95% or higher in 2 practice sessions

## Social & Competitive Quests
16. **League Climber** - Gain enough XP to move up in your league ranking
17. **Comeback King/Queen** - Improve your score by 10+ points from last week's average

## Learning & Growth Quests
18. **Knowledge Seeker** - Complete practice sessions from topics you've never tried before
19. **Weakness Warrior** - Focus on your lowest-performing subject (complete 3 sessions)
20. **Balanced Learner** - Score 70%+ in at least 2 different subjects

## Implementation Notes

### Current Implementation (5 Random Quests)
- The system generates 5 weekly quests randomly
- Always includes 1-2 core quests (guaranteed XP/accuracy/mistakes quests)
- Fills remaining slots with random quests from other categories
- Quest difficulty scales with player level for core quests

### Quest Categories:
- **Core**: Essential progression quests (XP, accuracy, mistake review)
- **Subject**: Focus on different subjects and exploration
- **Consistency**: Encourage regular daily practice
- **Challenge**: Push students to try harder content
- **Performance**: Reward high achievement
- **Social**: League and competitive elements
- **Learning**: Growth and exploration focused

### Functions Available:
- `generateWeeklyQuests(level, count)` - Generate new random weekly quests
- `getCurrentWeeklyQuests(level)` - Get current week's quests
- `calculateXPTarget(level)` - Calculate XP target based on level
- `calculateAccuracyTarget(level)` - Calculate accuracy session target based on level

### Future Enhancements:
- Add reward system integration
- Implement quest progress tracking
- Add quest completion animations
- Create quest history/achievements
- Add seasonal/special event quests 