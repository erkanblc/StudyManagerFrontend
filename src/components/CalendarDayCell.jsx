import { Box, Typography, Chip } from '@mui/material';
import { dayjs } from '../utils/helpers';
import {
  getDayStudyLevel,
  DAY_STUDY_STYLES,
  getDayTotalSeconds,
  formatStudyMinutes,
} from '../utils/studyCalendar';

const STAT_LINES = [
  { key: 'total', label: 'Total', color: 'text.primary', weight: 700 },
  { key: 'plans', label: 'Plans', color: 'secondary.main', weight: 600 },
  { key: 'sessions', label: 'Study Sessions', color: 'primary.main', weight: 600 },
];

const CalendarDayCell = ({
  day,
  daySessions = [],
  dayPlans = [],
  milestones = [],
  onDayClick,
  size = 'md',
  inGoalRange = false,
}) => {
  const isToday = day.isSame(dayjs(), 'day');
  const level = getDayStudyLevel(daySessions);
  const style = DAY_STUDY_STYLES[level];
  const planCount = dayPlans.length;
  const sessionCount = daySessions.length;
  const total = planCount + sessionCount;
  const hasStudy = sessionCount > 0;
  const hasPlan = planCount > 0;
  const hasData = total > 0;
  const hasMilestones = milestones.length > 0;
  const compact = size === 'sm';
  const studySeconds = getDayTotalSeconds(daySessions);
  const hasStudyTime = studySeconds > 0;

  return (
    <Box
      onClick={() => onDayClick?.(day, daySessions, dayPlans)}
      sx={{
        height: '100%',
        minHeight: compact ? 72 : 108,
        boxSizing: 'border-box',
        border: '2px solid',
        borderColor: inGoalRange
          ? '#3F51B5'
          : hasPlan
            ? '#6366f1'
            : isToday
              ? 'primary.main'
              : style.borderColor,
        borderRadius: compact ? 0.75 : 1.5,
        p: compact ? 0.35 : 0.75,
        pb: compact ? 0.35 : hasMilestones ? 2.5 : 0.75,
        bgcolor: inGoalRange
          ? hasStudy
            ? style.bgcolor
            : hasPlan
              ? '#C5CAE9'
              : 'rgba(63, 81, 181, 0.22)'
          : hasStudy
            ? style.bgcolor
            : hasPlan
              ? '#ede9fe'
              : style.bgcolor,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
        boxShadow: inGoalRange
          ? '0 0 0 2px rgba(63, 81, 181, 0.35)'
          : isToday
            ? '0 0 0 2px rgba(99,102,241,0.25)'
            : 'none',
        overflow: 'hidden',
        '&:hover': { transform: compact ? 'scale(1.08)' : 'scale(1.03)', boxShadow: 2, zIndex: 1 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: hasData ? 0.25 : 0 }}>
        <Typography
          variant="caption"
          fontWeight={isToday ? 700 : 600}
          color={isToday ? 'primary.main' : 'text.primary'}
          sx={{ fontSize: compact ? 9 : 12, lineHeight: 1 }}
        >
          {day.format('D')}
        </Typography>
      </Box>

      {hasData && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 0.2 : 0.35,
            mt: compact ? 0.2 : 0.35,
          }}
        >
          {STAT_LINES.map(({ key, label, color, weight }) => {
            const value = key === 'total' ? total : key === 'plans' ? planCount : sessionCount;
            return (
              <Typography
                key={key}
                variant="caption"
                fontWeight={weight}
                color={color}
                component="div"
                sx={{
                  fontSize: compact ? 8 : 10,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {label} {value}
              </Typography>
            );
          })}
          {hasStudyTime && (
            <Typography
              variant="caption"
              fontWeight={700}
              color="success.dark"
              component="div"
              sx={{
                fontSize: compact ? 8 : 10,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
              }}
            >
              {compact ? 'Hours' : 'Study Time'} {formatStudyMinutes(studySeconds)}
            </Typography>
          )}
        </Box>
      )}

      {hasMilestones && (
        <Chip
          label="🏆"
          size="small"
          color="warning"
          sx={{
            fontSize: 10,
            height: 18,
            minWidth: 22,
            borderRadius: 0.75,
            position: 'absolute',
            bottom: 2,
            right: 2,
            px: 0.5,
            '& .MuiChip-label': { px: 0.25 },
          }}
        />
      )}
    </Box>
  );
};

export default CalendarDayCell;
