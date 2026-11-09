import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hfClient } from '../src/services/ai/huggingface.client';

describe('Advanced Work DNA Intelligence Engine (Master Spec)', () => {
  it('detects multilingual inputs (Tamil, Hindi, Spanish, French, German, Arabic, Japanese)', () => {
    const tamil = hfClient.detectLanguage('ஒரு ரியாக்ட் இணையதளம் மற்றும் பேபால் பணப்பரிவர்த்தனை தளம் உருவாக்க வேண்டும்');
    assert.strictEqual(tamil.detectedLanguage, 'ta');
    assert.ok(tamil.isMultilingual);

    const hindi = hfClient.detectLanguage('एक सुरक्षित ई-कॉमर्स वेबसाइट और पेपाल भुगतान गेटवे बनाना है');
    assert.strictEqual(hindi.detectedLanguage, 'hi');
    assert.ok(hindi.isMultilingual);

    const spanish = hfClient.detectLanguage('Desarrollo de una aplicación web con autenticación de usuarios y pagos PayPal');
    assert.strictEqual(spanish.detectedLanguage, 'es');
    assert.ok(spanish.isMultilingual);

    const english = hfClient.detectLanguage('Build a fullstack booking platform with PayPal Orders v2 Sandbox escrow integration');
    assert.strictEqual(english.detectedLanguage, 'en');
    assert.strictEqual(english.isMultilingual, false);
  });

  it('enforces CRITICAL FINANCIAL SAFETY: never invents a budget if unconfirmed by human', async () => {
    const blueprintWithoutBudget = await hfClient.generateWorkBlueprint({
      projectTitle: 'Open Source Community Portal',
      projectSummary: 'A volunteer collaboration portal without an approved budget yet.',
      sourceText: 'Scope:\n1. User profiles\n2. Discussion forum\n3. Event calendar',
      // No totalAmountMinor supplied!
    });

    assert.strictEqual(blueprintWithoutBudget.budgetConfirmedByHuman, false, 'budgetConfirmedByHuman must be false');
    assert.strictEqual(blueprintWithoutBudget.totalBudgetMinor, undefined, 'totalBudgetMinor must remain undefined');

    // Milestones must require human input and not invent fabricated dollar amounts
    for (const ms of blueprintWithoutBudget.suggestedMilestones) {
      assert.strictEqual(ms.amountNeedsHumanInput, true, 'Every milestone must indicate amountNeedsHumanInput: true');
      assert.strictEqual(ms.suggestedAmountMinor, null, 'Milestone amounts must be null when budget is unconfirmed');
    }

    // A critical clarification question must be generated asking for the budget
    const budgetQuestion = blueprintWithoutBudget.categorizedClarifications?.find((c) => c.category === 'budget');
    assert.ok(budgetQuestion, 'Must generate a clarification question for missing budget');
    assert.strictEqual(budgetQuestion.importance, 'critical');
  });

  it('enforces TIMELINE SAFETY: labels estimates and asks for start date if missing', async () => {
    const blueprintWithoutDeadline = await hfClient.generateWorkBlueprint({
      projectTitle: 'AI Research Assistant',
      projectSummary: 'Autonomous agent researcher without confirmed start date.',
      sourceText: '1. Document parsing\n2. Vector indexing\n3. Citation generator',
      // No deadline supplied!
    });

    assert.strictEqual(blueprintWithoutDeadline.deadlineConfirmedByHuman, false);
    assert.strictEqual(blueprintWithoutDeadline.targetDeadline, undefined);

    const timelineQuestion = blueprintWithoutDeadline.categorizedClarifications?.find((c) => c.category === 'timeline');
    assert.ok(timelineQuestion, 'Must generate a clarification question for missing timeline/start date');
  });

  it('performs deep multi-dimensional analysis with risk register', async () => {
    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: 'FinTech Micro-Escrow Platform',
      projectSummary: 'P2P milestone payments with automated PayPal capture verification.',
      sourceText: '1. OAuth authentication\n2. Milestone escrow engine\n3. Webhook listener for chargebacks',
      totalAmountMinor: 300000,
      deadline: '2026-12-31',
      currency: 'USD',
    });

    // Business Analysis
    assert.ok(blueprint.businessAnalysis);
    assert.ok(blueprint.businessAnalysis.targetAudience.length > 0);
    assert.ok(blueprint.businessAnalysis.successMetrics.length > 0);

    // Technical Analysis
    assert.ok(blueprint.technicalAnalysis);
    assert.ok(blueprint.technicalAnalysis.technologyStack.frontend.length > 0);
    assert.ok(blueprint.technicalAnalysis.securityRequirements.length > 0);

    // Functional Analysis
    assert.ok(blueprint.functionalAnalysis);
    assert.ok(blueprint.functionalAnalysis.primaryUserJourneys.length > 0);
    assert.ok(blueprint.functionalAnalysis.keyEdgeCases.length > 0);

    // Delivery Analysis & Critical Path
    assert.ok(blueprint.deliveryAnalysis);
    assert.ok(blueprint.deliveryAnalysis.criticalPath.length > 0);

    // Risk Register
    assert.ok(blueprint.riskRegister && blueprint.riskRegister.length >= 3);
    const scopeRisk = blueprint.riskRegister.find((r) => r.category === 'scope');
    assert.ok(scopeRisk);
    assert.ok(scopeRisk.mitigationStrategy.length > 10);
    assert.strictEqual(scopeRisk.humanDecisionRequired, true);
  });

  it('generates structured testable acceptance criteria with verification methods', async () => {
    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: 'Healthcare Tele-Consultation App',
      projectSummary: 'HIPAA-compliant video appointments and doctor booking calendar.',
      sourceText: '1. Patient registration with MFA\n2. WebRTC encrypted video consults\n3. Consultation payment release via PayPal',
      totalAmountMinor: 400000,
      deadline: '2027-01-15',
    });

    const allTasks = blueprint.workstreams.flatMap((ws) => ws.tasks);
    const taskWithCriteria = allTasks.find((t) => t.structuredCriteria && t.structuredCriteria.length > 0);
    assert.ok(taskWithCriteria, 'Must generate structured acceptance criteria on tasks');

    const firstCriterion = taskWithCriteria.structuredCriteria![0];
    assert.ok(firstCriterion.id.startsWith('AC-'));
    assert.ok(firstCriterion.verificationMethod);
    assert.ok(firstCriterion.expectedResult.length > 5);
    assert.ok(firstCriterion.requiredEvidence.length > 0);
  });

  it('evaluates objective quality assessment scores across all 9 dimensions', async () => {
    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: 'SaaS Analytics Dashboard',
      projectSummary: 'Real-time telemetry and revenue forecasting with charts.',
      sourceText: '1. API telemetry ingestion\n2. Predictive revenue model\n3. PayPal subscription billing',
      totalAmountMinor: 150000,
      deadline: '2026-11-30',
    });

    const qa = blueprint.qualityAssessment;
    assert.ok(qa, 'Quality assessment must be populated');
    assert.ok(qa.overallScore >= 70 && qa.overallScore <= 100);
    assert.ok(qa.requirementCoverage >= 70);
    assert.ok(qa.technicalCompleteness >= 70);
    assert.ok(qa.taskClarity >= 70);
    assert.ok(qa.acceptanceCriteriaQuality >= 70);
    assert.ok(qa.dependencyConsistency >= 70);
    assert.ok(qa.timelineConsistency >= 70);
    assert.ok(qa.riskIdentification >= 70);
    assert.ok(qa.evidenceReadiness >= 70);
    assert.ok(qa.languageAccuracy >= 70);
    assert.ok(Object.keys(qa.explanations).length >= 4);
  });

  it('correctly handles Tamil project input, extracting requirements and creating blueprint', async () => {
    const tamilInput = {
      projectTitle: 'மருத்துவ ஆலோசனை தளம் (Medical Consultation)',
      projectSummary: 'மருத்துவர்களுக்கான அப்பாயிண்ட்மெண்ட் முன்பதிவு மற்றும் பேபால் கட்டணம் செலுத்தும் தளம்.',
      sourceText: `தேவைகள்:
1. நோயாளி பதிவு மற்றும் உள்நுழைவு (Patient registration & login).
2. மருத்துவர் கால அட்டவணை மற்றும் நேர முன்பதிவு (Doctor scheduling).
3. பேபால் சாண்ட்பாக்ஸ் மூலம் கட்டண பரிவர்த்தனை (PayPal checkout).`,
      totalAmountMinor: 200000,
      deadline: '2026-12-20',
      currency: 'USD',
    };

    const blueprint = await hfClient.generateWorkBlueprint(tamilInput);

    assert.ok(blueprint.languageMetadata);
    assert.strictEqual(blueprint.languageMetadata.detectedLanguage, 'ta');
    assert.strictEqual(blueprint.languageMetadata.isMultilingual, true);

    // Must successfully produce all workstreams and requirements
    assert.ok(blueprint.requirements && blueprint.requirements.length >= 3);
    assert.ok(blueprint.workstreams.length >= 3);
    assert.strictEqual(blueprint.totalBudgetMinor, 200000);
    assert.strictEqual(blueprint.targetDeadline, '2026-12-20');
  });
});

