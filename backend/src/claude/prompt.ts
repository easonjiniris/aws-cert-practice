import type { Domain } from "../types.js";

const DOMAIN_GUIDANCE: Record<Domain, string> = {
  cloud_concepts: `Cloud Concepts (24% of CLF-C02). Cover: definitions of cloud computing, six advantages of cloud, AWS Cloud Adoption Framework (CAF) perspectives, AWS Well-Architected Framework pillars, cloud economics (CapEx vs OpEx, TCO), high-level AWS global infrastructure (Regions, AZs, Edge Locations, Local Zones, Wavelength, Outposts), and basic AWS migration strategies (the 7 Rs).`,
  security: `Security and Compliance (30% of CLF-C02). Cover: AWS shared responsibility model (security OF vs IN the cloud); IAM concepts (users, groups, roles, policies, MFA, root user best practices, IAM Identity Center, federation); compliance and AWS Artifact; encryption services (KMS, CloudHSM, ACM); threat detection and monitoring (GuardDuty, Inspector, Macie, Detective, Security Hub); network security (Security Groups vs NACLs, AWS WAF, Shield, Firewall Manager, Network Firewall); auditing (CloudTrail, AWS Config); secrets management (Secrets Manager, Systems Manager Parameter Store).`,
  technology: `Cloud Technology and Services (34% of CLF-C02). Cover: methods of deploying and operating in the AWS Cloud (Console, CLI, SDKs, CloudFormation, CDK, Elastic Beanstalk); global infrastructure mapping to services; core services across compute (EC2, Lambda, ECS, EKS, Fargate, Lightsail, Batch, Auto Scaling, ELB), storage (S3 with storage classes, EBS, EFS, FSx, Storage Gateway, Backup, Snow Family), databases (RDS, Aurora, DynamoDB, ElastiCache, Redshift, Neptune, DocumentDB), networking (VPC, subnets, IGW, NAT, Route 53, CloudFront, Direct Connect, VPN, Transit Gateway, Global Accelerator, API Gateway), application integration (SQS, SNS, EventBridge, Step Functions), analytics (Athena, Glue, Kinesis, EMR, QuickSight), ML/AI (SageMaker, Rekognition, Comprehend, Polly, Translate, Bedrock at a high level), developer tools (CodeCommit, CodeBuild, CodeDeploy, CodePipeline, X-Ray), management and governance (CloudWatch, CloudTrail, Config, Trusted Advisor, Systems Manager, Organizations, Control Tower).`,
  billing_pricing: `Billing, Pricing, and Support (12% of CLF-C02). Cover: AWS pricing models (On-Demand, Reserved Instances, Savings Plans, Spot, Dedicated Hosts/Instances, free tier); billing and cost-management tools (Billing Dashboard, Cost Explorer, AWS Budgets, Cost & Usage Report, Cost Allocation Tags); AWS Organizations consolidated billing and benefits (volume discounts, sharing of RIs/Savings Plans); AWS Pricing Calculator and Migration Evaluator (TCO); AWS Support plans (Basic, Developer, Business, Enterprise On-Ramp, Enterprise) and what each includes (TAM, Trusted Advisor checks, response times); AWS Marketplace and license-included pricing.`,
};

const DOMAIN_LABEL: Record<Domain, string> = {
  cloud_concepts: "Cloud Concepts",
  security: "Security and Compliance",
  technology: "Cloud Technology and Services",
  billing_pricing: "Billing, Pricing, and Support",
};

export function buildPerDomainPrompt(domain: Domain, count: number): string {
  const mrCount = count >= 4 ? Math.max(1, Math.round(count * 0.15)) : 0;
  const mcCount = count - mrCount;

  const easy = Math.round(count * 0.3);
  const hard = Math.round(count * 0.2);
  const medium = Math.max(0, count - easy - hard);

  return `You are an AWS certification exam writer. Generate ${count} practice questions for the AWS Certified Cloud Practitioner (CLF-C02) exam in the **${DOMAIN_LABEL[domain]}** domain.

DOMAIN SCOPE
${DOMAIN_GUIDANCE[domain]}

QUESTION FORMATS — produce both formats in this exact mix:
- ${mcCount} questions of type "multiple_choice": exactly 4 options (ids A, B, C, D), exactly ONE option with is_correct=true.
- ${mrCount} questions of type "multiple_response": exactly 5 options (ids A, B, C, D, E), TWO OR MORE options with is_correct=true. If multi-response, the stem should say "(Choose TWO.)" or "(Choose THREE.)" matching the number of correct answers.

DIFFICULTY MIX (approximate):
- ${easy} easy, ${medium} medium, ${hard} hard.

STYLE
- Match the look and tone of real CLF-C02 questions: concise scenario-based stems, vendor-neutral phrasing, plausible distractors (other AWS services that sound related but don't fit), no trick wording.
- For every INCORRECT option (is_correct=false), include a "reason" field (1–2 sentences) explaining why that option is wrong, referencing the relevant AWS service or concept. Reasons should be informative enough to study from.
- For CORRECT options (is_correct=true), OMIT the "reason" field entirely — no explanation needed.
- Vary topics within the domain — do NOT generate multiple questions about the same service unless it is genuinely central to the domain.

CONSTRAINTS
- Every question's "domain" field MUST be "${domain}".
- Do not include an "id" field on questions — the caller will assign ids.
- Return your output by calling the "submit_questions" tool exactly once with the full array of ${count} questions.`;
}
