/**
 * FHIR R4 Mapping & Mock ABDM/ABHA Gateway Service
 * Provides standardized HL7 FHIR R4 resources and simulated ABDM health record exchange.
 */

class FhirService {
  /**
   * Maps HealthCopilot Patient & Document records to an HL7 FHIR R4 Document Bundle
   */
  mapToFhirBundle(user, document) {
    const bundleId = `urn:uuid:healthcopilot-bundle-${document._id}`;
    const timestamp = new Date().toISOString();

    const patientResource = {
      fullUrl: `urn:uuid:patient-${user._id}`,
      resource: {
        resourceType: 'Patient',
        id: user._id.toString(),
        identifier: [
          {
            system: 'https://healthcopilot.vault/patients',
            value: user._id.toString(),
          },
          ...(user.mockAbha?.isLinked
            ? [
                {
                  system: 'https://abdm.gov.in/abha-address',
                  value: user.mockAbha.abhaAddress,
                },
                {
                  system: 'https://abdm.gov.in/abha-number',
                  value: user.mockAbha.abhaNumber,
                },
              ]
            : []),
        ],
        active: true,
        name: [
          {
            use: 'official',
            text: user.name || 'Patient',
          },
        ],
        telecom: [
          {
            system: 'email',
            value: user.email,
          },
        ],
        gender: user.gender === 'male' ? 'male' : user.gender === 'female' ? 'female' : 'other',
        birthDate: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : undefined,
      },
    };

    const docReferenceResource = {
      fullUrl: `urn:uuid:docref-${document._id}`,
      resource: {
        resourceType: 'DocumentReference',
        id: document._id.toString(),
        status: 'current',
        docStatus: document.structuredData?.reviewStatus === 'VERIFIED' ? 'final' : 'preliminary',
        type: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11503-0',
              display: document.documentType || 'Medical Records',
            },
          ],
          text: document.documentType,
        },
        subject: {
          reference: `urn:uuid:patient-${user._id}`,
          display: user.name,
        },
        date: (document.structuredData?.documentDate || document.createdAt).toISOString(),
        content: [
          {
            attachment: {
              contentType: document.fileType,
              url: document.fileUrl,
              title: document.fileName,
              size: document.fileSize,
            },
          },
        ],
      },
    };

    const observations = (document.structuredData?.labResults || []).map((lab, idx) => ({
      fullUrl: `urn:uuid:obs-${document._id}-${idx}`,
      resource: {
        resourceType: 'Observation',
        id: `${document._id}-obs-${idx}`,
        status: document.structuredData?.reviewStatus === 'VERIFIED' ? 'final' : 'preliminary',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: {
          text: lab.testName,
        },
        subject: {
          reference: `urn:uuid:patient-${user._id}`,
          display: user.name,
        },
        effectiveDateTime: (document.structuredData?.documentDate || document.createdAt).toISOString(),
        valueQuantity: lab.numericValue
          ? {
              value: lab.numericValue,
              unit: lab.unit,
              system: 'http://unitsofmeasure.org',
            }
          : undefined,
        valueString: !lab.numericValue ? lab.result : undefined,
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: lab.abnormalFlag === 'HIGH' ? 'H' : lab.abnormalFlag === 'LOW' ? 'L' : 'N',
                display: lab.abnormalFlag,
              },
            ],
            text: lab.interpretation,
          },
        ],
        referenceRange: lab.referenceRange
          ? [
              {
                text: lab.referenceRange,
              },
            ]
          : [],
      },
    }));

    const medicationRequests = (document.structuredData?.prescriptions || []).map((rx, idx) => ({
      fullUrl: `urn:uuid:med-${document._id}-${idx}`,
      resource: {
        resourceType: 'MedicationRequest',
        id: `${document._id}-med-${idx}`,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          text: rx.medicationName,
        },
        subject: {
          reference: `urn:uuid:patient-${user._id}`,
          display: user.name,
        },
        authoredOn: (document.structuredData?.documentDate || document.createdAt).toISOString(),
        dosageInstruction: [
          {
            text: `${rx.dosage || ''} ${rx.frequency || ''} - ${rx.instructions || ''}`.trim(),
            timing: {
              code: {
                text: rx.frequency,
              },
            },
          },
        ],
      },
    }));

    const diagnosticReport = {
      fullUrl: `urn:uuid:diag-${document._id}`,
      resource: {
        resourceType: 'DiagnosticReport',
        id: `diag-${document._id}`,
        status: 'final',
        code: {
          text: document.documentType || 'Clinical Diagnostic Report',
        },
        subject: {
          reference: `urn:uuid:patient-${user._id}`,
          display: user.name,
        },
        effectiveDateTime: (document.structuredData?.documentDate || document.createdAt).toISOString(),
        issued: timestamp,
        result: observations.map((o) => ({
          reference: o.fullUrl,
          display: o.resource.code.text,
        })),
        conclusion: document.summary?.overview || 'Diagnostic evaluation processed by HealthCopilot.',
      },
    };

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: timestamp,
        profile: ['http://hl7.org/fhir/StructureDefinition/document'],
      },
      type: 'document',
      timestamp,
      entry: [
        patientResource,
        docReferenceResource,
        diagnosticReport,
        ...observations,
        ...medicationRequests,
      ],
    };
  }

  /**
   * Generates sample synthetic ABDM/ABHA records for interactive testing and demonstration
   */
  getSampleAbhaRecords() {
    return [
      {
        id: 'ABDM-REC-101',
        title: 'Apollo Diagnostics Comprehensive Metabolic Panel',
        facility: 'Apollo Health City, Jubilee Hills',
        type: 'Lab Report',
        recordDate: '2026-03-15T08:30:00Z',
        source: 'Ayushman Bharat Digital Mission (ABDM Sandbox)',
        provenance: 'HIP-APOLLO-TELANGANA-9921',
        contentSummary:
          'Comprehensive laboratory analysis including Fasting Blood Glucose, HbA1c, Serum Creatinine, and Total Cholesterol.',
        simulatedLabResults: [
          {
            testName: 'Fasting Blood Glucose',
            result: '118 mg/dL',
            numericValue: 118,
            unit: 'mg/dL',
            referenceRange: '70 - 100 mg/dL',
            abnormalFlag: 'HIGH',
            interpretation: 'Fasting glucose level is slightly elevated above the standard normal ceiling.',
          },
          {
            testName: 'HbA1c (Glycated Hemoglobin)',
            result: '6.2 %',
            numericValue: 6.2,
            unit: '%',
            referenceRange: '< 5.7 %',
            abnormalFlag: 'HIGH',
            interpretation: 'Consistent with early impaired glucose tolerance / prediabetes range.',
          },
          {
            testName: 'Serum Creatinine',
            result: '0.9 mg/dL',
            numericValue: 0.9,
            unit: 'mg/dL',
            referenceRange: '0.6 - 1.2 mg/dL',
            abnormalFlag: 'NORMAL',
            interpretation: 'Renal filtration indicator is well within healthy physiological limits.',
          },
          {
            testName: 'Total Cholesterol',
            result: '210 mg/dL',
            numericValue: 210,
            unit: 'mg/dL',
            referenceRange: '< 200 mg/dL',
            abnormalFlag: 'HIGH',
            interpretation: 'Borderline elevated lipid concentration.',
          },
        ],
        simulatedPrescriptions: [
          {
            medicationName: 'Metformin 500mg',
            dosage: '500mg',
            frequency: '1-0-0 (Once daily)',
            duration: '90 days',
            instructions: 'Take with breakfast',
            prescribingDoctor: 'Dr. V. Rao, MD (Endocrinology)',
            isCurrentMedication: true,
          },
        ],
      },
      {
        id: 'ABDM-REC-102',
        title: 'Yashoda Hospitals Cardiology Discharge Summary',
        facility: 'Yashoda Super Specialty Hospital, Secunderabad',
        type: 'Discharge Summary',
        recordDate: '2026-02-10T14:00:00Z',
        source: 'Ayushman Bharat Digital Mission (ABDM Sandbox)',
        provenance: 'HIP-YASHODA-TS-4412',
        contentSummary:
          'Clinical follow-up report post cardiac evaluation. Stable vitals with dietary and exercise recommendations.',
        simulatedLabResults: [
          {
            testName: 'Blood Pressure',
            result: '124/82 mmHg',
            numericValue: 124,
            unit: 'mmHg',
            referenceRange: '< 120/80 mmHg',
            abnormalFlag: 'NORMAL',
            interpretation: 'Pre-hypertensive to optimal systolic pressure maintained on medical therapy.',
          },
          {
            testName: 'HDL (Good) Cholesterol',
            result: '48 mg/dL',
            numericValue: 48,
            unit: 'mg/dL',
            referenceRange: '> 40 mg/dL',
            abnormalFlag: 'NORMAL',
            interpretation: 'Adequate protective lipid level.',
          },
        ],
        simulatedPrescriptions: [
          {
            medicationName: 'Atorvastatin 10mg',
            dosage: '10mg',
            frequency: '0-0-1 (Nightly)',
            duration: '60 days',
            instructions: 'Take after dinner at bedtime',
            prescribingDoctor: 'Dr. S. K. Murthy, DM (Cardiology)',
            isCurrentMedication: true,
          },
        ],
      },
    ];
  }
}

module.exports = new FhirService();
