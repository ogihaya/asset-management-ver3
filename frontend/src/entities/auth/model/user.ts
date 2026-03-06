import type { User } from './types';

/**
 * Userエンティティクラス
 * ドメインロジックをカプセル化
 */
export class UserEntity implements User {
  id: number;
  email?: string;
  name?: string;

  constructor(data: User) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
  }

  // ユーザー名の取得（メールアドレスから生成など）
  getDisplayName(): string {
    return this.name || this.email || `User ${this.id}`;
  }

  // DTOからエンティティへの変換
  static fromDTO(dto: User): UserEntity {
    return new UserEntity(dto);
  }

  // エンティティからDTOへの変換
  toDTO(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
    };
  }
}
