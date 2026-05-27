export {
  signIn, signUp, signOut, getSession,
  requestPasswordReset, updatePassword,
  type AuthUser,
} from "./api";
export { AuthProvider, useAuth } from "./context";
export { authErrorToArabic } from "./errorMap";
export {
  sendPhoneOtp,
  verifyPhoneOtp,
  normalizeEgyptianPhone,
  maskPhoneForDisplay,
  OTP_TTL_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  PHONE_VERIFICATION_ENABLED,
} from "./phoneOtp";
export type { OtpError, SendOtpOptions, VerifyOtpOptions } from "./phoneOtp";
export { PhoneVerifyModal } from "./components/PhoneVerifyModal";
export type { PhoneVerifyModalProps } from "./components/PhoneVerifyModal";
