# DOOT — Backup, Recovery & Data Lifecycle Policy

## 1. Database Backup Strategy (PostgreSQL 18)

### Frequency & Types
1. **Continuous WAL Archiving**: Write-Ahead Logging for Point-In-Time-Recovery (PITR) up to 14 days.
2. **Daily Full Physical/Logical Dumps**: Executed daily at 02:00 UTC using `pg_dump`:
   ```bash
   pg_dump -Fc -h localhost -U doot_app -d doot_production > /backups/doot_$(date +%Y%m%d_%H%M%S).dump
   ```
3. **Backup Encryption**: Dumps are encrypted at rest using AES-256 before transfer to secure object storage (AWS S3 or GCS) with Object Lock enabled.
4. **Retention**:
   - Hourly backups: Retained 48 hours.
   - Daily backups: Retained 30 days.
   - Monthly snapshots: Retained 12 months.

---

## 2. Disaster Recovery & Restoration Procedure

To restore DOOT into a fresh staging or disaster recovery environment:
```bash
# 1. Decrypt dump
gpg --decrypt /backups/doot_20261015.dump.gpg > /tmp/doot_restore.dump

# 2. Recreate target database
dropdb -h localhost -U postgres doot_production_test
createdb -h localhost -U postgres doot_production_test

# 3. Restore schema & data
pg_restore -h localhost -U postgres -d doot_production_test --clean --if-exists /tmp/doot_restore.dump

# 4. Verify data integrity
psql -h localhost -U postgres -d doot_production_test -c "SELECT count(*) FROM \"Organization\";"
```

---

## 3. Cryptographic Key Management & Envelope Rotation
- Third-party secrets (WhatsApp Access Tokens, AI API Keys, Messenger Tokens) are encrypted using AES-256-GCM.
- Each ciphertext record stores its key version prefix (e.g. `v1:iv:tag:cipher`).
- **Key Rotation Procedure**:
  1. Add `ENCRYPTION_KEY_V2` in production environment.
  2. Set `ACTIVE_KEY_VERSION=v2`. All new writes use V2.
  3. Execute background key rotation script to decrypt V1 records and re-encrypt with V2.
  4. Retain `ENCRYPTION_KEY_V1` in environment until migration verification completes.

---

## 4. Tenant Deletion vs Account Suspension
- **Account Suspension**: Applied via Platform Administration. Blocks outbound messages and campaign jobs immediately without destroying data or corrupting audit logs.
- **Offboarding & Hard Deletion**: When an organization requests complete erasure under GDPR/privacy law, foreign keys are deleted in reverse dependency order with an immutable audit tombstone record retained for legal compliance.
