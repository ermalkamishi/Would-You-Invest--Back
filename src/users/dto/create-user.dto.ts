export class CreateUserDto {
  bio?: string;
  investmentThesis?: string;
  avatarUrl?: string;
  avatarLastChangedAt?: Date;
  isStealth?: boolean;
  linkedInUrl?: string;
  verifiedEmailDomain?: string;
  badges?: string[];
}
