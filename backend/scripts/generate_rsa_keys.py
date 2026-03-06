"""
RSA鍵ペア生成スクリプト（JWT RS256専用）

JWT署名用のRSA-2048ビット鍵ペアを生成します。
HS256（32文字の対称鍵）からRS256（2048ビットRSA）への移行により、
セキュリティが大幅に向上します。

セキュリティの改善:
- HS256: 32文字（256ビット）の対称鍵 → ブルートフォース攻撃に脆弱
- RS256: 2048ビットRSA鍵 → 現代の計算能力でも解読不可能

使用方法:
    python backend/scripts/generate_rsa_keys.py
    または
    make generate-rsa-keys

生成されるファイル:
    - backend/jwt_private_key.pem: 秘密鍵（サーバーのみで使用、絶対に公開しない）
    - backend/jwt_public_key.pem: 公開鍵（トークン検証に使用、公開可能）

注意:
    - 秘密鍵は絶対にGitにコミットしないでください
    - 秘密鍵は環境変数として設定してください
    - 本番環境では別の方法で鍵を管理することを推奨します
"""

import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def generate_rsa_keys():
    """RSA-2048ビット鍵ペアを生成してPEM形式で保存"""

    # 秘密鍵を生成
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )

    # 公開鍵を取得
    public_key = private_key.public_key()

    # 秘密鍵をPEM形式にシリアライズ
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    # 公開鍵をPEM形式にシリアライズ
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    # ファイルパスを設定（backendディレクトリ直下）
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    private_key_path = os.path.join(backend_dir, 'jwt_private_key.pem')
    public_key_path = os.path.join(backend_dir, 'jwt_public_key.pem')

    # 秘密鍵を保存
    with open(private_key_path, 'wb') as f:
        f.write(private_pem)

    # 公開鍵を保存
    with open(public_key_path, 'wb') as f:
        f.write(public_pem)

    print('✓ RSA鍵ペアを生成しました')
    print(f'  秘密鍵: {private_key_path}')
    print(f'  公開鍵: {public_key_path}')
    print()
    print('【重要】セキュリティ上の注意:')
    print('  1. 秘密鍵（jwt_private_key.pem）は絶対にGitにコミットしないでください')
    print('  2. 秘密鍵は .gitignore に追加されています')
    print('  3. 環境変数として設定してください:')
    print()
    print('     # Linuxの場合')
    print(f'     export JWT_PRIVATE_KEY=$(cat {private_key_path})')
    print(f'     export JWT_PUBLIC_KEY=$(cat {public_key_path})')
    print()
    print('  4. .envファイルに設定する場合（改行を\\nに変換）:')
    print('     JWT_PRIVATE_KEY=<改行を\\nに変換した秘密鍵>')
    print('     JWT_PUBLIC_KEY=<改行を\\nに変換した公開鍵>')


if __name__ == '__main__':
    generate_rsa_keys()
