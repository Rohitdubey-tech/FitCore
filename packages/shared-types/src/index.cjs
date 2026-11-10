const USER_ROLES = ['super_admin', 'gym_admin', 'trainer', 'member'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'pending_verification', 'deleted'];
const GYM_STATUSES = ['active', 'suspended', 'pending'];
const GYM_SUBSCRIPTION_TIERS = ['starter', 'growth', 'enterprise'];
const GYM_MEMBER_STATUSES = ['active', 'inactive', 'expired', 'suspended'];
const FITNESS_GOALS = [
  'fat_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'general_fitness',
];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const TRAINER_STATUSES = ['active', 'inactive', 'on_leave'];
const PLAN_DURATION_TYPES = [
  'monthly',
  'quarterly',
  'half_yearly',
  'annual',
  'custom',
];
const SUBSCRIPTION_STATUSES = [
  'active',
  'expired',
  'suspended',
  'cancelled',
  'pending_payment',
];
const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
];
const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
];
const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'resistance_band',
  'cardio_machine',
];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const DIETARY_PREFERENCES = [
  'vegetarian',
  'vegan',
  'eggetarian',
  'non_vegetarian',
];
const FITCORE_THEME = {
  background: '#101112',
  cardBackground: '#1C1F20',
  primaryAccent: '#C6FF45',
  primaryText: '#FFFFFF',
  secondaryText: '#A1A1AA',
  border: '#303438',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
};

module.exports = {
  USER_ROLES,
  ACCOUNT_STATUSES,
  GYM_STATUSES,
  GYM_SUBSCRIPTION_TIERS,
  GYM_MEMBER_STATUSES,
  FITNESS_GOALS,
  EXPERIENCE_LEVELS,
  TRAINER_STATUSES,
  PLAN_DURATION_TYPES,
  SUBSCRIPTION_STATUSES,
  PAYMENT_STATUSES,
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  MEAL_TYPES,
  DIETARY_PREFERENCES,
  FITCORE_THEME,
};
