---
paths: infra/**
---
# Infrastructure Architecture Guide

## Table of Contents

1. [Overview](#overview)
2. [4-Layer Architecture](#4-layer-architecture)
3. [Project Structure](#project-structure)
4. [Stack Configuration](#stack-configuration)
5. [Layer Details](#layer-details)
6. [Network Design](#network-design)
7. [Security Design](#security-design)
8. [Operations](#operations)
9. [CI/CD Pipeline](#cicd-pipeline)

---

## Overview

Infrastructure design using AWS CDK (Cloud Development Kit) with a **complete 4-layer architecture**.

### Project Features

- **Complete 4-layer structure**: Construct -> Resource -> Stack -> bin/
- **L2 constructs only**: Following AWS best practices
- **Secure by default**: Secure settings applied to all resources
- **Environment-specific config**: Easy switching between dev/stg/prod
- **Scalable**: Supports small to large-scale projects

---

## 4-Layer Architecture

### Architecture Overview

```
Layer 4: bin/app.ts                    <- Select which stacks to use
    ↓
Layer 3: lib/stack/                    <- Deploy units (CloudFormation Stack)
    ↓
Layer 2: lib/resource/                 <- Feature units (combination of AWS services)
    ↓
Layer 1: lib/construct/                <- Single AWS resource abstraction
    ↓
Layer 0: aws-cdk-lib                   <- Official AWS CDK library
```

---

## Project Structure

```
infra/
├── bin/
│   ├── app.ts                           # Layer 4: Application entry point
│   └── poc-app.ts                       # POC entry point
│
├── lib/
│   ├── construct/                       # Layer 1: Single AWS resource abstraction
│   │   ├── compute/
│   │   │   ├── lambda-construct.ts
│   │   │   ├── ecs-construct.ts
│   │   │   ├── ecr-construct.ts
│   │   │   ├── bastion-construct.ts
│   │   │   └── scheduled-task-construct.ts
│   │   ├── datastore/
│   │   │   ├── dynamodb-construct.ts
│   │   │   ├── rds-construct.ts
│   │   │   ├── aurora-construct.ts
│   │   │   └── s3-construct.ts
│   │   ├── networking/
│   │   │   ├── vpc-construct.ts
│   │   │   ├── alb-construct.ts
│   │   │   ├── security-group-construct.ts
│   │   │   ├── isolation-security-group-construct.ts
│   │   │   └── isolation-nacl-construct.ts
│   │   ├── messaging/
│   │   │   ├── sns-construct.ts
│   │   │   └── sqs-construct.ts
│   │   ├── security/
│   │   │   ├── cognito-construct.ts
│   │   │   ├── secrets-manager-construct.ts
│   │   │   └── waf-construct.ts
│   │   ├── api/
│   │   │   ├── api-gateway-construct.ts
│   │   │   └── cloudfront-construct.ts
│   │   └── hosting/
│   │       └── amplify-construct.ts
│   │
│   ├── resource/                        # Layer 2: Feature unit combinations
│   │   ├── network-resource.ts
│   │   ├── data-storage-resource.ts
│   │   ├── database-resource.ts
│   │   ├── object-storage-resource.ts
│   │   ├── api-resource.ts
│   │   ├── frontend-resource.ts
│   │   ├── messaging-resource.ts
│   │   └── security-resource.ts
│   │
│   └── stack/                           # Layer 3: Deploy units
│       ├── foundation/
│       │   └── foundation-stack.ts
│       ├── data-storage/
│       │   └── data-storage-stack.ts
│       ├── object-storage/
│       │   └── object-storage-stack.ts
│       ├── security/
│       │   └── security-stack.ts
│       ├── backend/
│       │   └── backend-stack.ts
│       ├── frontend/
│       │   └── frontend-stack.ts
│       ├── integration/
│       │   └── integration-stack.ts
│       ├── batch/
│       │   └── batch-stack.ts
│       ├── observability/
│       │   └── observability-stack.ts
│       └── poc/
│           └── poc-stack.ts
│
├── config/                              # Environment-specific config
│   ├── environment.ts
│   ├── dev.ts
│   ├── stg.ts
│   ├── prod.ts
│   └── index.ts
│
└── lambda/                              # Lambda function code
    └── index.js
```

---

## Stack Configuration

### Implemented Stacks (10 stacks)

| Stack | Responsibility | Change Frequency | Deploy Time |
|-------|---------------|-----------------|-------------|
| FoundationStack | Network infrastructure (VPC, subnets, NAT) | Yearly | 3-5 min |
| DataStorageStack | Database (DynamoDB, RDS, Aurora, Bastion) | Monthly | 5-10 min |
| ObjectStorageStack | Object storage (S3) | Rare | 1-2 min |
| SecurityStack | Auth & secrets (Cognito, Secrets Manager) | Monthly | 3-5 min |
| BackendStack | Backend API (Lambda, API Gateway, ECS, ALB) | Weekly | 5-7 min |
| FrontendStack | Frontend delivery (Amplify or S3+CloudFront) | Daily | 3-5 min |
| IntegrationStack | System integration (SNS, SQS, DLQ) | Monthly | 2-3 min |
| BatchStack | Batch processing (ECS Scheduled Task) | Monthly | 3-5 min |
| ObservabilityStack | Monitoring (CloudWatch Alarms, Dashboards) | Monthly | 2-3 min |
| PocStack | POC/Validation | As needed | Varies |

### Separation Benefits

- **Independent DB and S3 management**: Resources with different change frequencies and deletion policies separated
- **Fast frontend updates**: 3-5 minutes
- **No backend change impact**: Frontend unaffected during API updates
- **Independent deployment**: Teams can work in parallel

---

## Network Design

### VPC Subnet Configuration

```
10.0.0.0/16 (VPC)
├── 10.0.0.0/20   - Public Subnet (AZ-a)   <- ALB, NAT Gateway
├── 10.0.16.0/20  - Public Subnet (AZ-c)   <- ALB, NAT Gateway
├── 10.0.32.0/20  - Private Subnet (AZ-a)  <- ECS, Lambda, RDS
└── 10.0.48.0/20  - Private Subnet (AZ-c)  <- ECS, Lambda, RDS
```

### VPC Endpoints

| Type | Service | Cost |
|------|---------|------|
| Gateway | S3 | Free |
| Gateway | DynamoDB | Free |
| Interface | ECR API | Paid |
| Interface | ECR Docker | Paid |
| Interface | CloudWatch Logs | Paid |
| Interface | Secrets Manager | Paid |

### Environment-specific Network Settings

| Environment | AZs | NAT Gateways | Purpose |
|-------------|-----|--------------|---------|
| dev | 1 | 1 | Cost reduction |
| stg | 2 | 2 | Production-equivalent testing |
| prod | 2 | 2 | High availability |

---

## Security Design

### Security Group Isolation

```
Internet
    │
    ▼
┌─────────────┐
│     ALB     │ <- HTTP/HTTPS (0.0.0.0/0)
│   (SG-ALB)  │
└─────────────┘
    │ port 80
    ▼
┌─────────────┐
│     ECS     │ <- ALB-SG only
│   (SG-ECS)  │
└─────────────┘
    │ port 5432
    ▼
┌─────────────┐
│     RDS     │ <- ECS-SG, Lambda-SG only
│   (SG-RDS)  │
└─────────────┘
```

### WAF (Web Application Firewall)

| Rule | Protection |
|------|-----------|
| AWSManagedRulesCommonRuleSet | OWASP Top 10 (XSS, LFI, etc.) |
| AWSManagedRulesKnownBadInputsRuleSet | Known malicious patterns |
| AWSManagedRulesSQLiRuleSet | SQL injection |
| AWSManagedRulesAmazonIpReputationList | Malicious IP blocking |
| RateLimitRule | DDoS protection (2000 req/5min) |

### S3 Security

- Complete public access block (`BLOCK_ALL`)
- Server-side encryption (S3-Managed)
- HTTPS enforced (`enforceSSL: true`)
- Versioning enabled (default)
- CloudFront access via OAC (Origin Access Control)

### RDS/Aurora Security

- Storage encryption
- VPC private subnet placement
- Auto backup enabled
- Auto minor version upgrade: dev/stg enabled, prod disabled

---

## Operations

### Bastion Host

RDS/Aurora connection bastion server.

| Method | Features | Recommended |
|--------|----------|-------------|
| SSM Session Manager | No SSH needed, IAM auth, audit logs | All environments (recommended) |
| SSH | Traditional, key management required | Dev only |

### DB Connection

```bash
# Port forwarding via SSM
aws ssm start-session \
  --target i-xxxxxxxxxx \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["your-rds-endpoint"],"portNumber":["5432"],"localPortNumber":["5432"]}'
```

---

## CI/CD Pipeline

### GitHub Actions Authentication

OIDC-based secure authentication:

- No long-term access keys needed
- IAM role-based temporary credentials
- Least privilege principle applied

### ECR Deploy Strategy

- **Only use commit SHA as tag** (no `latest` tag)
- Immutable image management
- Easy rollback (just specify past commit SHA)
- Audit trail (clear which commit is running in production)

### Deploy Flow

```
develop branch -> Staging (auto deploy)
main branch    -> Production (auto deploy or approval-based deploy)
```
