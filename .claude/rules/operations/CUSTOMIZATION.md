# プロジェクトカスタマイズガイド

## 目次

1. [はじめに](#はじめに)
2. [カスタマイズの優先順位](#カスタマイズの優先順位)
3. [認証関連](#認証関連)
   - 3.1 [認証機能のオン/オフ](#31-認証機能のオンオフ)
   - 3.2 [ログインフィールドの変更](#32-ログインフィールドの変更)
   - 3.3 [認証 API エンドポイント](#33-認証apiエンドポイント)
   - 3.4 [ユーザー型定義](#34-ユーザー型定義)
   - 3.5 [認証後のリダイレクト先](#35-認証後のリダイレクト先)
   - 3.6 [保護ルートの設定](#36-保護ルートの設定)
   - 3.7 [Cookie/Token 設定](#37-cookietoken設定)
4. [色・テーマ](#4-色テーマ)
   - 4.1 [グローバル CSS の色定義](#41-グローバルcssの色定義)
   - 4.2 [Tailwind 設定](#42-tailwind設定)
   - 4.3 [shadcn/ui のテーマ](#43-shadcnuiのテーマ)
5. [ページ・レイアウト](#5-ページレイアウト)
   - 5.1 [ログインページ](#51-ログインページ)
   - 5.2 [ダッシュボードページ](#52-ダッシュボードページ)
   - 5.3 [認証レイアウト](#53-認証レイアウト)
6. [環境設定](#6-環境設定)
   - 6.1 [アプリ名・メタデータ](#61-アプリ名メタデータ)
   - 6.2 [環境変数](#62-環境変数)
   - 6.3 [JWT 鍵の設定](#63-jwt鍵の設定)
   - 6.4 [CORS 設定](#64-cors設定)
   - 6.5 [ロゴ・ファビコン](#65-ロゴファビコン)
   - 6.6 [package.json](#66-packagejson)
7. [インフラ設定](#7-インフラ設定)
   - 7.1 [CDK システム名](#71-cdkシステム名)
   - 7.2 [Docker Compose](#72-docker-compose)
8. [チェックリスト](#8-チェックリスト)

---

## はじめに

このテンプレートは汎用的な設定で構築されています。新しいプロジェクトを開始する際は、このガイドに従ってプロジェクト固有の設定にカスタマイズしてください。

### テンプレートの現状

- ✅ 認証機能（ログイン・ログアウト）が実装済み
- ✅ ダッシュボードページが実装済み
- ⚠️ デザイン・色は仮の設定
- ⚠️ 認証フィールドは汎用的な設定（`login_id`）
- ⚠️ アプリ名やロゴは仮のもの

---

## カスタマイズの優先順位

### 🔴 必須（高優先度）- プロジェクト開始時に必ず変更

| 項目                                                 | 作業時間 | 重要度 |
| ---------------------------------------------------- | -------- | ------ |
| [認証フィールドの変更](#31-ログインフィールドの変更) | 30 分    | ★★★    |
| [アプリ名・メタデータ](#61-アプリ名メタデータ)       | 15 分    | ★★★    |
| [環境変数の設定](#62-環境変数)                       | 30 分    | ★★★    |
| [CORS 設定](#64-cors設定)                            | 10 分    | ★★★    |
| [JWT 鍵の生成](#63-jwt鍵の設定)                      | 15 分    | ★★★    |
| [ロゴ・ファビコン](#65-ロゴファビコン)               | 20 分    | ★★★    |

**合計**: 約 2 時間

---

### 🟡 重要（中優先度）- 初期開発段階で対応

| 項目                                                     | 作業時間 | 重要度 |
| -------------------------------------------------------- | -------- | ------ |
| [色・テーマの変更](#4-色テーマ)                          | 1 時間   | ★★☆    |
| [ダッシュボードのカスタマイズ](#52-ダッシュボードページ) | 2-4 時間 | ★★☆    |
| [ログインページデザイン](#51-ログインページ)             | 1-2 時間 | ★★☆    |
| [保護ルートの追加](#35-保護ルートの設定)                 | 30 分    | ★★☆    |
| [CDK システム名](#71-cdkシステム名)                      | 10 分    | ★★☆    |

**合計**: 約 5-8 時間

---

### 🟢 推奨（低優先度）- 必要に応じて対応

| 項目                                    | 作業時間 | 重要度 |
| --------------------------------------- | -------- | ------ |
| [レイアウト改善](#53-認証レイアウト)    | 2-4 時間 | ★☆☆    |
| デバッグログ削除                        | 30 分    | ★☆☆    |
| [パッケージ名変更](#66-packagejson)     | 5 分     | ★☆☆    |
| [Docker コンテナ名](#72-docker-compose) | 10 分    | ★☆☆    |

---

## 認証関連

### 3.1 認証機能のオン/オフ

このテンプレートでは、環境変数を設定するだけで認証機能を無効化できます。PoC や社内ツールなど、認証が不要なケースで便利です。

#### 設定方法

**フロントエンド** (`frontend/.env.local`)

```bash
# 認証を無効化
NEXT_PUBLIC_ENABLE_AUTH=false

# 認証を有効化（デフォルト）
NEXT_PUBLIC_ENABLE_AUTH=true
```

**バックエンド** (`backend/.env`)

```bash
# 認証を無効化
ENABLE_AUTH=false

# 認証を有効化（デフォルト）
ENABLE_AUTH=true
```

#### 動作の違い

| 状態 | フロントエンド | バックエンド |
|------|--------------|-------------|
| 有効（デフォルト） | ログインページへリダイレクト、401 時にリダイレクト | JWT 検証を実行 |
| 無効 | 全ページにアクセス可能、ログアウトボタン非表示 | ダミーユーザーを返却 |

#### 影響を受けるファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/middleware.ts` | ルート保護のスキップ |
| `frontend/src/app/providers.tsx` | 認証状態初期化のスキップ |
| `frontend/src/shared/api/client/http-client.ts` | 401 リダイレクトのスキップ |
| `frontend/src/app/(authenticated)/dashboard/page.tsx` | ログアウトボタンの非表示 |
| `backend/app/infrastructure/security/security_service_impl.py` | ダミーユーザーの返却 |

#### 注意事項

- **両方の環境変数を設定してください**: フロントエンドとバックエンドの両方で設定が必要です
- **本番環境では有効化を推奨**: 認証を無効化するのは開発・PoC 環境に限定してください
- **API 保護**: 認証を無効化しても、API エンドポイント自体は残ります（ダミーユーザーとして処理）

---

### 3.2 ログインフィールドの変更

#### カスタマイズ例 1: メールアドレスに変更

**Step 1**: フォームを変更

```tsx
// frontend/src/widgets/login-form/LoginForm.tsx
<Label htmlFor='email'>メールアドレス</Label>
<Input
  id='email'
  type='email'
  placeholder='email@example.com'
  {...register('email')}
/>
```

**Step 2**: バリデーションを変更

```tsx
// frontend/src/widgets/login-form/LoginForm.tsx
const loginSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .min(1, "メールアドレスは必須です"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
});
```

**Step 3**: 型定義を変更

```typescript
// frontend/src/entities/auth/model/types.ts
export interface LoginRequest {
  email: string; // ← login_id から変更
  password: string;
}
```

**Step 4**: バックエンドのモデルを変更

```python
# backend/app/domain/auth/model.py
@dataclass
class LoginRequest:
    email: str  # ← login_id から変更
    password: str
```

**Step 5**: バックエンドのユースケースを変更

```python
# backend/app/application/auth/login_use_case.py
def execute(self, input_dto: LoginInputDto) -> LoginOutputDto:
    user = self.user_repository.find_by_email(input_dto.email)  # ← 変更
    if not user:
        raise ValueError("Invalid credentials")
    # ...
```

#### カスタマイズ例 2: ユーザー名に変更

```tsx
// frontend/src/widgets/login-form/LoginForm.tsx
<Label htmlFor='username'>ユーザー名</Label>
<Input
  id='username'
  type='text'
  placeholder='ユーザー名を入力'
  {...register('username')}
/>
```

```typescript
// frontend/src/entities/auth/model/types.ts
export interface LoginRequest {
  username: string;
  password: string;
}
```

バックエンドも同様に `username` に変更してください。

---

### 3.3 認証 API エンドポイント

#### 現在の実装

**ファイル**: `frontend/src/entities/auth/api/auth-api.ts`

```typescript
const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      "/auth/login",
      credentials
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await httpClient.post("/auth/logout");
  },
};
```

#### カスタマイズ方法

バックエンドのエンドポイント構造に合わせて変更：

```typescript
const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      "/api/v1/auth/login", // ← バージョン付きAPIに変更
      credentials
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await httpClient.post("/api/v1/auth/logout");
  },
};
```

---

### 3.4 ユーザー型定義

#### 現在の実装

**ファイル**: `frontend/src/entities/auth/model/types.ts`

```typescript
export interface User {
  id: number;
  email?: string;
  name?: string;
}
```

#### カスタマイズ例: フィールドを追加

プロジェクトの要件に応じて必要なフィールドを追加：

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string; // プロフィール画像
  role: "admin" | "user"; // ユーザーロール
  company?: string; // 所属企業
  createdAt: string; // 登録日時
}
```

バックエンドのモデルも同様に更新：

```python
# backend/app/domain/entities/user.py
from pydantic import BaseModel, Field

class User(BaseModel):
    """ユーザーエンティティ"""
    id: int
    email: str
    name: str
    avatar: str | None = None
    role: str = 'user'
    company: str | None= None
    created_at: datetime = field(default_factory=datetime.now)

    class Config:
        """Pydantic設定"""

        from_attributes = True  # SQLAlchemyモデルから変換可能にする

```

---

### 3.5 認証後のリダイレクト先

#### 現在の実装

**ファイル**: `frontend/src/features/auth/login/lib/use-login.ts`

```typescript
onSuccess: (data) => {
  dispatch(setUser({ id: data.user_id }));
  router.push("/dashboard"); // ← ここ
};
```

---

### 3.6 保護ルートの設定

#### 現在の実装

**ファイル**: `frontend/src/middleware.ts`

```typescript
const PROTECTED_PATHS = ["/dashboard"];
const AUTH_PATHS = ["/login"];
```

#### カスタマイズ方法

プロジェクトの要件に応じてルートを追加：

```typescript
// 認証が必要なページ
const PROTECTED_PATHS = [
  "/dashboard",
  "/profile",
  "/settings",
  "/admin",
  "/projects",
];

// ログイン済みの場合アクセスできないページ
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];
```

#### 特定のルートを管理者のみにする

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get("access_token");

  // 管理者専用ルート
  if (pathname.startsWith("/admin")) {
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // TODO: トークンからロールを取得して確認
    // const user = decodeToken(accessToken);
    // if (user.role !== 'admin') {
    //   return NextResponse.redirect(new URL('/dashboard', request.url));
    // }
  }

  // 通常の保護ルート
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}
```

---

### 3.7 Cookie/Token 設定

#### 現在の実装

**ファイル**: `backend/app/presentation/api/auth_api.py`

```python
response.set_cookie(
    key='access_token',
    value=output_dto.access_token,
    httponly=True,
    secure=True,
    samesite='lax',
    max_age=7 * 24 * 60 * 60,  # 7日間
)
```

#### カスタマイズ例 1: 有効期限を 1 日に変更

```python
response.set_cookie(
    key='access_token',
    value=output_dto.access_token,
    httponly=True,
    secure=True,
    samesite='lax',
    max_age=24 * 60 * 60,  # 1日
)
```

#### カスタマイズ例 2: Cookie 名をプロジェクト固有に

```python
response.set_cookie(
    key='yourapp_token',  # ← プロジェクト固有の名前
    value=output_dto.access_token,
    httponly=True,
    secure=True,
    samesite='lax',
    max_age=7 * 24 * 60 * 60,
)
```

**注意**: Frontend の middleware でも Cookie 名を変更する必要があります。

```typescript
// frontend/src/middleware.ts
const accessToken = request.cookies.get("yourapp_token"); // ← 変更
```

---

## 4. 色・テーマ

### 4.1 グローバル CSS の色定義

#### 現在の実装

**ファイル**: `frontend/src/app/globals.css`

```css
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --accent: 210 40% 96.1%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }
}
```

#### カスタマイズ方法

**Step 1**: ブランドカラーを決定

[HSL Color Picker](https://hslpicker.com/) を使って色を選択。

**例**: ブルー系のブランドカラー

```css
:root {
  /* プライマリカラー（ブランドカラー） */
  --primary: 210 100% 50%; /* 鮮やかなブルー */
  --primary-foreground: 0 0% 100%; /* 白文字 */

  /* セカンダリカラー */
  --secondary: 210 40% 96%; /* 薄いブルー */
  --secondary-foreground: 222.2 47.4% 11.2%;

  /* アクセントカラー */
  --accent: 280 100% 50%; /* 紫 */
  --accent-foreground: 0 0% 100%;

  /* その他 */
  --destructive: 0 84.2% 60.2%; /* 赤（削除ボタン等） */
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}
```

**Step 2**: ダークモードの調整

```css
.dark {
  --primary: 210 100% 60%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --accent: 280 100% 60%;
  --accent-foreground: 0 0% 100%;
}
```

#### カスタマイズ例: カスタムカラーの追加

```css
:root {
  /* 既存のカラー */
  --primary: 210 100% 50%;

  /* カスタムカラー */
  --brand-blue: 210 100% 50%;
  --brand-green: 142 76% 36%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --info: 199 89% 48%;
}
```

**Tailwind で使用**:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "hsl(var(--brand-blue))",
          green: "hsl(var(--brand-green))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
      },
    },
  },
};
```

```tsx
// 使用例
<Button className="bg-success">保存</Button>
<Alert className="bg-warning">警告メッセージ</Alert>
```

---

### 4.2 Tailwind 設定

#### 現在の実装

**ファイル**: `frontend/tailwind.config.ts`

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ...
      },
    },
  },
};
```

#### カスタマイズ例 1: カスタムフォントの追加

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
      },
    },
  },
};
```

```tsx
// 使用例
<h1 className="font-heading">見出し</h1>
<p className="font-sans">本文</p>
```

---

### 4.3 shadcn/ui のテーマ

#### 現在の実装

**ファイル**: `frontend/components.json`

```json
{
  "style": "default",
  "tailwind": {
    "baseColor": "slate",
    "cssVariables": true
  }
}
```

#### カスタマイズ方法

`baseColor` を変更してベースカラーを調整：

```json
{
  "style": "default",
  "tailwind": {
    "baseColor": "zinc", // slate, gray, zinc, neutral, stone
    "cssVariables": true
  }
}
```

**変更後は shadcn/ui コンポーネントを再追加**:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

---

## 5. ページ・レイアウト

### 5.1 ログインページ

#### 現在の実装

**ファイル**: `frontend/src/page-components/login/ui/LoginPage.tsx`

```tsx
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
```

#### カスタマイズ例 1: ロゴと背景を追加

```tsx
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="w-full max-w-md space-y-8">
        {/* ロゴ */}
        <div className="text-center">
          <img src="/logo.png" alt="Logo" className="mx-auto h-12 w-auto" />
          <h2 className="mt-6 text-3xl font-bold text-white">ようこそ</h2>
        </div>

        {/* ログインフォーム */}
        <LoginForm />

        {/* フッターリンク */}
        <div className="text-center text-sm text-white">
          <a href="/register" className="hover:underline">
            新規登録はこちら
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### カスタマイズ例 2: 2 カラムレイアウト

```tsx
export function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* 左側: ブランディングエリア */}
      <div className="hidden w-1/2 bg-primary p-12 lg:block">
        <div className="flex h-full flex-col justify-between">
          <img src="/logo-white.png" alt="Logo" className="h-8 w-auto" />
          <div>
            <h1 className="text-4xl font-bold text-white">
              プロジェクトを加速する
            </h1>
            <p className="mt-4 text-xl text-white/80">
              最高のソリューションをあなたに
            </p>
          </div>
          <div className="text-sm text-white/60">© 2025 Your Company</div>
        </div>
      </div>

      {/* 右側: ログインフォーム */}
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md px-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
```

---

### 5.2 ダッシュボードページ

ここは好きに変えてください

---

### 5.3 認証レイアウト

ヘッダーやサイドバーなど、必要に応じてレイアウトを追加してください。

---

## 6. 環境設定

### 6.1 アプリ名・メタデータ

#### 現在の実装

**ファイル**: `frontend/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "AI Solution Template",
  description: "Startup template with Next.js and FastAPI",
};
```

#### カスタマイズ方法

```typescript
export const metadata: Metadata = {
  title: "Your App Name",
  description: "Your app description for SEO",
  keywords: ["keyword1", "keyword2", "keyword3"],
  authors: [{ name: "Your Company" }],
  openGraph: {
    title: "Your App Name",
    description: "Your app description",
    url: "https://yourapp.com",
    siteName: "Your App Name",
    images: [
      {
        url: "https://yourapp.com/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your App Name",
    description: "Your app description",
    images: ["https://yourapp.com/twitter-image.png"],
  },
};
```

**公開ページのレイアウトも更新**:

**ファイル**: `frontend/src/app/(public)/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "Your App - Login",
  description: "Login to Your App",
};
```

---

### 6.2 環境変数

#### Frontend 環境変数

**ファイル**: `frontend/.env.local.example`

```bash
# 現在の設定
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

**カスタマイズ例**:

```bash
# API設定
NEXT_PUBLIC_API_URL=https://api.yourapp.com

# アプリケーション設定
NEXT_PUBLIC_APP_NAME=YourAppName
NEXT_PUBLIC_APP_VERSION=1.0.0

# 外部サービス
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# 機能フラグ
NEXT_PUBLIC_ENABLE_FEATURE_X=true

# 環境
NODE_ENV=production
```

**`.env.local` ファイルを作成**:

```bash
cp .env.local.example .env.local
# .env.local を編集
```

#### Backend 環境変数

**ファイル**: `backend/.env.example`

```bash
# 現在の設定
# Application
ENVIRONMENT=development

# Database
POSTGRES_USER=app_user
POSTGRES_PASSWORD=app_password
POSTGRES_DB=ai_solution_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Database URL for SQLAlchemy
DATABASE_URL=postgresql+psycopg2://app_user:app_password@db:5432/ai_solution_db

# JWT Settings (RS256)
# RSA鍵ペアを生成するには: make generate-rsa-keys
# 改行は \n に変換してください
JWT_ALGORITHM=RS256
JWT_EXPIRATION_HOURS=24
JWT_PRIVATE_KEY=your-private-key-here
JWT_PUBLIC_KEY=your-public-key-here
```

**カスタマイズ例**:

```bash
# データベース設定
POSTGRES_USER=yourapp_user
POSTGRES_PASSWORD=your_secure_password_123
POSTGRES_DB=yourapp_production
DATABASE_URL=postgresql://yourapp_user:your_secure_password_123@db:5432/yourapp_production

# JWT設定（後述）
JWT_PRIVATE_KEY=<生成した秘密鍵>
JWT_PUBLIC_KEY=<生成した公開鍵>
JWT_ALGORITHM=RS256

# アプリケーション設定
APP_NAME=YourApp
APP_VERSION=1.0.0
DEBUG=false

# CORS設定
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com

# 外部サービス
SENDGRID_API_KEY=your_sendgrid_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

**`.env` ファイルを作成**:

```bash
cd backend
cp .env.example .env
# .env を編集
```

---

### 6.3 JWT 鍵の設定

#### JWT 鍵の生成

- 下記コマンドで、秘密鍵・公開鍵のペアが新しく生成される。
- これらの内容をコピーし、.env に書き込む必要がある。

```bash
make generate-rsa-keys
```

**注意**:

- 秘密鍵は絶対に Git にコミットしない
- 本番環境では、新しく鍵のペアを生成し、環境変数またはシークレット管理サービス（AWS Secrets Manager 等）を使用して管理するべき。

---

### 6.4 CORS 設定

#### 現在の実装

**ファイル**: `backend/app/main.py`

```python
allowed_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    # ここに本番環境のドメインをデプロイ後追加する。
]
```

#### カスタマイズ方法

本番環境のドメインを追加：

```python
allowed_origins = [
    'http://localhost:3000',           # ローカル開発
    'http://127.0.0.1:3000',
    'https://yourapp.com',             # 本番環境
    'https://www.yourapp.com',
    'https://staging.yourapp.com',     # ステージング環境
]
```

---

### 6.5 ロゴ・ファビコン

#### 現在のファイル

**ディレクトリ**: `frontend/public/`

- `favicon.ico`
- `apple-icon.png`
- `logo.png`

#### カスタマイズ方法

**Step 1**: ロゴ・アイコンを準備

以下のサイズを用意：

- **favicon.ico**: 16x16, 32x32
- **apple-icon.png**: 180x180（iOS ホーム画面用）
- **logo.png**: ヘッダー等で使用（推奨: 200x50 程度）
- **og-image.png**: OGP 用（推奨: 1200x630）

**Step 2**: ファイルを置き換え

```bash
# frontend/public/ にファイルをコピー
cp your-favicon.ico public/favicon.ico
cp your-apple-icon.png public/apple-icon.png
cp your-logo.png public/logo.png
cp your-og-image.png public/og-image.png
```

**Step 3**: メタデータを更新

```typescript
// frontend/src/app/layout.tsx
export const metadata: Metadata = {
  title: "Your App",
  description: "Your app description",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    images: ["/og-image.png"],
  },
};
```

**Step 4**: ロゴを使用

```tsx
// コンポーネント内で使用
<img src="/logo.png" alt="Your App Logo" className="h-8" />
```

---

### 6.6 package.json

#### 現在の実装

**ファイル**: `frontend/package.json`

```json
{
  "name": "ai-solution-template-frontend",
  "version": "0.1.0",
  "private": true
}
```

#### カスタマイズ方法

```json
{
  "name": "yourapp-frontend",
  "version": "1.0.0",
  "description": "Your app description",
  "author": "Your Company",
  "license": "MIT",
  "private": true
}
```

---

## 7. インフラ設定

### 7.1 CDK システム名

#### 現在の実装

**ファイル**: `infra/bin/solution-project-template.ts`

```typescript
const systemName = "sol";
```

#### カスタマイズ方法

プロジェクト固有のシステム名に変更（3-5 文字の小文字推奨）:

```typescript
const systemName = "yourapp"; // または 'yap', 'myapp' など
```

**注意**: この名前は AWS リソース名のプレフィックスになります。

例: `yourapp-dev-vpc`, `yourapp-prod-ecs-cluster`

---

### 7.2 Docker Compose

#### 現在の実装

**ファイル**: `docker-compose.yml`

```yaml
services:
  db:
    container_name: postgres_container_ai_solution
    # ...

  pgadmin:
    container_name: pgadmin_container_ai_solution
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
```

#### カスタマイズ方法

コンテナ名と pgAdmin 認証情報を変更：

```yaml
services:
  db:
    container_name: postgres_yourapp
    # ...

  pgadmin:
    container_name: pgadmin_yourapp
    environment:
      PGADMIN_DEFAULT_EMAIL: your-email@example.com
      PGADMIN_DEFAULT_PASSWORD: your_secure_password
```

---

## 8. チェックリスト

プロジェクトカスタマイズ完了チェックリスト

- [ ] ログインフィールドを変更（login_id → email 等）
- [ ] 認証 API エンドポイントを確認・変更
- [ ] ユーザー型定義をプロジェクトに合わせて変更
- [ ] アプリ名・メタデータを変更
- [ ] Frontend 環境変数を設定（`.env`）
- [ ] Backend 環境変数を設定（`.env`）
- [ ] CORS 設定に本番ドメインを追加
- [ ] JWT 鍵を生成・設定
- [ ] ロゴ・ファビコンを差し替え
- [ ] プライマリカラーを変更（`globals.css`）
- [ ] ダッシュボードページをカスタマイズ
- [ ] ログインページのデザインを変更
- [ ] 保護ルートを追加
- [ ] 認証後のリダイレクト先を確認
- [ ] CDK システム名を変更
- [ ] Docker コンテナ名を変更
- [ ] pgAdmin 認証情報を変更
- [ ] カスタムカラーを追加
- [ ] Tailwind カスタム設定を追加

---

## まとめ

このガイドに従ってカスタマイズを進めることで、テンプレートをプロジェクト固有の要件に合わせることができます。

### サポート

カスタマイズで困った場合は、以下のドキュメントを参照してください：

- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - アーキテクチャ設計
- [FRONTEND_DEVELOPMENT_GUIDE.md](./FRONTEND_DEVELOPMENT_GUIDE.md) - 開発ガイド
- [FRONTEND_TESTING_GUIDE.md](./FRONTEND_TESTING_GUIDE.md) - テストガイド

---

**最終更新**: 2025-11-12
**バージョン**: 1.0.0
