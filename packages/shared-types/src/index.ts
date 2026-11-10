export const USER_ROLES = ['super_admin', 'gym_admin', 'trainer', 'member'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ['active', 'suspended', 'pending_verification', 'deleted'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const GYM_STATUSES = ['active', 'suspended', 'pending'] as const;
export type GymStatus = (typeof GYM_STATUSES)[number];

export const GYM_SUBSCRIPTION_TIERS = ['starter', 'growth', 'enterprise'] as const;
export type GymSubscriptionTier = (typeof GYM_SUBSCRIPTION_TIERS)[number];

export const GYM_MEMBER_STATUSES = ['active', 'inactive', 'expired', 'suspended'] as const;
export type GymMemberStatus = (typeof GYM_MEMBER_STATUSES)[number];

export const FITNESS_GOALS = [
  'fat_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'general_fitness',
] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const TRAINER_STATUSES = ['active', 'inactive', 'on_leave'] as const;
export type TrainerStatus = (typeof TRAINER_STATUSES)[number];

export const PLAN_DURATION_TYPES = [
  'monthly',
  'quarterly',
  'half_yearly',
  'annual',
  'custom',
] as const;
export type PlanDurationType = (typeof PLAN_DURATION_TYPES)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'expired',
  'suspended',
  'cancelled',
  'pending_payment',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MUSCLE_GROUPS = [
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
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'resistance_band',
  'cardio_machine',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const DIETARY_PREFERENCES = [
  'vegetarian',
  'vegan',
  'eggetarian',
  'non_vegetarian',
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

export interface UserProfileDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  status: AccountStatus;
  isEmailVerified: boolean;
  gymIds: string[];
  activeGymId?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponseDTO {
  user: UserProfileDTO;
  tokens: AuthTokensDTO;
}

export interface GymBranchDTO {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  isPrimary: boolean;
}

export interface OperatingHoursDTO {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface GymDTO {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  timezone: string;
  currency: string;
  operatingHours: OperatingHoursDTO[];
  branches: GymBranchDTO[];
  status: GymStatus;
  subscriptionTier: GymSubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

export interface GymMemberDTO {
  id: string;
  gymId: string;
  branchId?: string;
  userId: string;
  assignedTrainerId?: string;
  membershipCode: string;
  status: GymMemberStatus;
  fitnessGoal?: FitnessGoal;
  experienceLevel?: ExperienceLevel;
  joinedAt: string;
  notes?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TrainerScheduleSlotDTO {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface TrainerDTO {
  id: string;
  gymId: string;
  branchId?: string;
  userId: string;
  specializations: string[];
  certifications: string[];
  experienceYears: number;
  bio?: string;
  hourlyRate?: number;
  schedule: TrainerScheduleSlotDTO[];
  status: TrainerStatus;
  assignedMemberCount: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlanDTO {
  id: string;
  gymId: string;
  name: string;
  description?: string;
  durationType: PlanDurationType;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  includesPersonalTraining: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDTO {
  id: string;
  gymId: string;
  memberId: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalCount: number;
  suspendedReason?: string;
  plan?: {
    id: string;
    name: string;
    durationType: PlanDurationType;
    durationDays: number;
    price: number;
    currency: string;
  };
  member?: {
    id: string;
    membershipCode: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDTO {
  id: string;
  gymId: string;
  memberId: string;
  userId: string;
  planId: string;
  subscriptionId?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  invoiceNumber?: string;
  receipt: string;
  failureReason?: string;
  refundedAmount: number;
  refundId?: string;
  refundReason?: string;
  paidAt?: string;
  refundedAt?: string;
  plan?: {
    id: string;
    name: string;
    durationType: PlanDurationType;
  };
  member?: {
    id: string;
    membershipCode: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RevenueSummaryDTO {
  totalCollected: number;
  pendingAmount: number;
  refundedAmount: number;
  paidCount: number;
  failedCount: number;
  currency: string;
}

export interface InvoiceDTO {
  invoiceNumber: string;
  issuedAt: string;
  status: PaymentStatus;
  gym: {
    name: string;
    contactEmail: string;
    contactPhone: string;
  };
  member: {
    name: string;
    email: string;
    membershipCode: string;
  };
  plan: {
    name: string;
    durationDays: number;
  };
  amount: number;
  refundedAmount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
}

export interface ExerciseDTO {
  id: string;
  gymId?: string;
  name: string;
  slug: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  difficulty: ExperienceLevel;
  description: string;
  instructions: string[];
  tips: string[];
  isSystem: boolean;
}

export interface WorkoutPlanExerciseDTO {
  exerciseId: string;
  exerciseName?: string;
  muscleGroup?: MuscleGroup;
  sets: number;
  reps: string;
  restSeconds: number;
  targetWeightKg?: number;
  notes?: string;
}

export interface WorkoutPlanDayDTO {
  dayNumber: number;
  title: string;
  exercises: WorkoutPlanExerciseDTO[];
}

export interface WorkoutPlanDTO {
  id: string;
  gymId?: string;
  createdByUserId: string;
  assignedMemberId?: string;
  name: string;
  goal?: FitnessGoal;
  difficulty: ExperienceLevel;
  daysPerWeek: number;
  days: WorkoutPlanDayDTO[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionSetDTO {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isCompleted: boolean;
  isPersonalRecord: boolean;
}

export interface WorkoutSessionExerciseDTO {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSessionSetDTO[];
}

export interface WorkoutSessionDTO {
  id: string;
  gymId?: string;
  userId: string;
  memberId?: string;
  workoutPlanId?: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exercises: WorkoutSessionExerciseDTO[];
  totalVolumeKg: number;
  personalRecordsHit: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutStatsDTO {
  totalCompletedSessions: number;
  currentStreakDays: number;
  totalVolumeKg: number;
  totalPersonalRecords: number;
}

export interface FoodItemDTO {
  id: string;
  name: string;
  slug: string;
  category: string;
  cuisine: 'indian' | 'international';
  dietaryTags: string[];
  servingSizeGrams: number;
  servingLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams: number;
  isVerified: boolean;
  source: string;
}

export interface DietPlanMealItemDTO {
  foodItemId?: string;
  name: string;
  quantityLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
}

export interface DietPlanDTO {
  id: string;
  gymId?: string;
  userId: string;
  memberId?: string;
  title: string;
  dietaryPreference: DietaryPreference;
  dailyTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  };
  meals: Record<MealType, DietPlanMealItemDTO[]>;
  isAIGenerated: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface FoodLogDTO {
  id: string;
  userId: string;
  dateKey: string;
  mealType: MealType | 'water';
  foodItemId?: string;
  foodName: string;
  servings: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
  loggedAt: string;
}

export interface DailyNutritionSummaryDTO {
  dateKey: string;
  targets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  };
  consumed: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  };
  logs: FoodLogDTO[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | Array<{ path: string; message: string }>;
  };
}

export const FITCORE_THEME = {
  background: '#101112',
  cardBackground: '#1C1F20',
  primaryAccent: '#C6FF45',
  primaryText: '#FFFFFF',
  secondaryText: '#A1A1AA',
  border: '#303438',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
} as const;
