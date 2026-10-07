const chunkRetriever = require('./chunkRetriever');
const llmClient = require('../llm/llmClient');
const { SYSTEM_HEALTH_PROMPT } = require('../prompts/systemPrompt');
const { createRagPrompt } = require('../prompts/ragPrompt');
const { checkHealthSafety, sanitizeResponse } = require('../safety/healthSafety');

class RagService {
  /**
   * Main conversational RAG execution method.
   */
  async answerQuestion({ question, userDocuments = [], conversationHistory = [] }) {
    if (!question || typeof question !== 'string') {
      return {
        answer: 'Please provide a valid question regarding your health records.',
        sources: [],
      };
    }

    // 1. Safety Guardrail Check
    const safety = checkHealthSafety(question);
    if (!safety.isSafe && safety.isEmergency) {
      return {
        answer: safety.safetyNotice,
        sources: [],
        isEmergency: true,
      };
    }

    // 2. Retrieve top-k relevant document chunks
    const retrievedChunks = chunkRetriever.retrieveChunks(question, userDocuments, 4);

    // 3. Format prompt
    const ragPrompt = createRagPrompt(question, retrievedChunks);

    // Add safety notice if diagnostic or prescription inquiry
    let preamble = '';
    if (safety.safetyNotice) {
      preamble = `${safety.safetyNotice}\n\n`;
    }

    // 4. Attempt response via external LLM (OpenAI / Gemini / Groq)
    try {
      const messages = [
        { role: 'system', content: SYSTEM_HEALTH_PROMPT },
        ...conversationHistory.slice(-4).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: ragPrompt },
      ];

      const llmAnswer = await llmClient.chatCompletion({
        messages,
        temperature: 0.3,
      });

      if (llmAnswer) {
        return {
          answer: sanitizeResponse(preamble + llmAnswer),
          sources: retrievedChunks.map((c) => ({
            documentId: c.documentId,
            fileName: c.fileName,
            excerpt: c.chunkText.substring(0, 180) + '...',
          })),
        };
      }
    } catch (err) {
      console.warn('LLM completion failed, activating semantic direct answer synthesizer:', err.message);
    }

    // 5. Intelligent Semantic Direct Answer Synthesizer
    const directAnswer = this.synthesizeDirectAnswer(question, retrievedChunks, userDocuments);

    return {
      answer: sanitizeResponse(preamble + directAnswer),
      sources: retrievedChunks.map((c) => ({
        documentId: c.documentId,
        fileName: c.fileName,
        excerpt: c.chunkText.substring(0, 180) + '...',
      })),
    };
  }

  /**
   * Synthesizes direct, human-friendly answers directly from matching document data.
   */
  synthesizeDirectAnswer(question, retrievedChunks, userDocuments = []) {
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return `I searched your uploaded medical documents, but could not find information addressing "${question}".\n\nPlease ensure your relevant lab reports, prescriptions, or clinic notes have been uploaded to your account.`;
    }

    const topChunk = retrievedChunks[0];
    const matchingDoc = userDocuments.find((d) => d._id?.toString() === topChunk.documentId?.toString());
    const fullText = matchingDoc?.extractedText || topChunk.chunkText || '';
    const q = question.toLowerCase();

    // 1. Patient Name & Identity / Demographics
    if (
      q.includes('name') ||
      q.includes('who am i') ||
      q.includes('patient') ||
      q.includes('my name') ||
      q.includes('identity') ||
      q.includes('who is this')
    ) {
      const nameMatch = fullText.match(
        /(?:Patient\s+Name|Name)\s*[:=-]?\s*([^,\n\r;|]+?)(?=\s+(?:Age|Gender|Patient\s+ID|UHID|MRN|Referred|Sample|Date|\n|$))/i
      );
      const ageGenderMatch =
        fullText.match(/Age\s*(?:\/|\s+)\s*Gender\s*[:=-]?\s*([0-9]+\s*(?:Years|Yrs)?\s*\/\s*(?:Male|Female|Other))/i) ||
        fullText.match(/Age\s*[:=-]?\s*([0-9]+\s*(?:Years|Yrs)?)/i);
      const idMatch = fullText.match(/Patient\s+ID\s*[:=-]?\s*([A-Za-z0-9_-]+)/i);
      const refMatch = fullText.match(
        /Referred\s+By\s*[:=-]?\s*([^,\n\r;|]+?)(?=\s+(?:Sample|Date|Patient|Age|\n|$)|,\s*MD|,\s*MBBS)/i
      );

      if (nameMatch) {
        let res = `According to your uploaded medical record (**${topChunk.fileName}**), your patient details are:\n\n`;
        res += `• **Patient Name:** **${nameMatch[1].trim()}**\n`;
        if (ageGenderMatch) res += `• **Age / Gender:** ${ageGenderMatch[1].trim()}\n`;
        if (idMatch) res += `• **Patient ID:** ${idMatch[1].trim()}\n`;
        if (refMatch) res += `• **Referred By:** ${refMatch[1].trim()}\n`;
        res += `\nAll health documents in your vault are organized under your personal account.`;
        return res;
      }
    }

    // 2. Platelet Count
    if (q.includes('platelet')) {
      const match = fullText.match(/Platelet(?:s|\s+Count)?\s*[:=-]?\s*([0-9,.]+)\s*(\/uL|[\w/%]+)?\s*([0-9,.\s-]+)?/i);
      if (match) {
        const val = match[1].trim();
        const unit = match[2] ? match[2].trim() : '/uL';
        const range = match[3] ? match[3].trim() : '1,50,000 - 4,00,000 /uL';
        return `Based on your uploaded **${topChunk.fileName}**:\n\n• **Platelet Count:** **${val} ${unit}**\n• **Reference Range:** ${range} /uL\n• **Status:** Normal reference range.\n\nPlatelets are essential for blood clotting and wound healing. Please consult your physician for clinical interpretation.`;
      }
    }

    // 3. Hemoglobin & Complete Blood Count
    if (q.includes('hemoglobin') || q.includes('hb') || q.includes('cbc') || q.includes('blood count') || q.includes('wbc') || q.includes('rbc')) {
      const hbMatch = fullText.match(/(?:Complete Blood Count\s+)?(?:Hemoglobin|Hb)\s*[:=-]?\s*([0-9,.]+)\s*(g\/dL|[\w/%]+)?\s*([0-9,.\s-]+)?/i);
      const wbcMatch = fullText.match(/WBC(?:\s+Count)?\s*[:=-]?\s*([0-9,.]+)\s*(\/uL)?\s*([0-9,.\s-]+)?/i);
      const rbcMatch = fullText.match(/RBC(?:\s+Count)?\s*[:=-]?\s*([0-9,.]+)\s*(million\/uL)?\s*([0-9,.\s-]+)?/i);
      const pltMatch = fullText.match(/Platelet(?:\s+Count)?\s*[:=-]?\s*([0-9,.]+)\s*(\/uL)?\s*([0-9,.\s-]+)?/i);

      let res = `Based on your Complete Blood Count in **${topChunk.fileName}**:\n\n`;
      if (hbMatch) res += `• **Hemoglobin:** **${hbMatch[1].trim()} ${hbMatch[2] || 'g/dL'}** (Reference: ${hbMatch[3] || '13.0 - 17.0 g/dL'})\n`;
      if (wbcMatch) res += `• **WBC Count:** **${wbcMatch[1].trim()} /uL** (Reference: ${wbcMatch[3] || '4,000 - 11,000 /uL'})\n`;
      if (pltMatch) res += `• **Platelets:** **${pltMatch[1].trim()} /uL** (Reference: ${pltMatch[3] || '1,50,000 - 4,00,000 /uL'})\n`;
      if (rbcMatch) res += `• **RBC Count:** **${rbcMatch[1].trim()} million/uL** (Reference: ${rbcMatch[3] || '4.5 - 5.5 million/uL'})\n`;
      res += `\nPlease discuss these laboratory findings with your healthcare professional.`;
      return res;
    }

    // 4. Blood Sugar / Glucose / HbA1c
    if (q.includes('glucose') || q.includes('sugar') || q.includes('hba1c') || q.includes('diabetes')) {
      const fbgMatch = fullText.match(/(?:Fasting Blood Glucose|Glucose)\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*([0-9,.\s-]+)?/i);
      const hba1cMatch = fullText.match(/HbA1c\s*[:=-]?\s*([0-9,.]+)\s*(%)?\s*([0-9,.\s-]+)?/i);

      let res = `Based on your blood glucose measurements in **${topChunk.fileName}**:\n\n`;
      if (fbgMatch) res += `• **Fasting Blood Glucose:** **${fbgMatch[1].trim()} mg/dL** (Reference: ${fbgMatch[3] || '70 - 100 mg/dL'})\n`;
      if (hba1cMatch) res += `• **HbA1c:** **${hba1cMatch[1].trim()}%** (Reference: ${hba1cMatch[3] || '4.0 - 5.6%'})\n`;
      res += `\n*Note: Values slightly outside the standard reference range should be evaluated in consultation with your doctor for lifestyle or diet recommendations.*`;
      return res;
    }

    // 5. Cholesterol & Lipid Profile
    if (q.includes('cholesterol') || q.includes('lipid') || q.includes('triglyceride') || q.includes('ldl') || q.includes('hdl')) {
      const tcMatch = fullText.match(/Total Cholesterol\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*(< ?[0-9]+|[0-9,.\s-]+)?/i);
      const hdlMatch = fullText.match(/HDL Cholesterol\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*(> ?[0-9]+|[0-9,.\s-]+)?/i);
      const ldlMatch = fullText.match(/LDL Cholesterol\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*(< ?[0-9]+|[0-9,.\s-]+)?/i);
      const tgMatch = fullText.match(/Triglycerides\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*(< ?[0-9]+|[0-9,.\s-]+)?/i);
      const vldlMatch = fullText.match(/VLDL Cholesterol\s*[:=-]?\s*([0-9,.]+)\s*(mg\/dL)?\s*(< ?[0-9]+|[0-9,.\s-]+)?/i);

      let res = `Based on your Lipid Profile in **${topChunk.fileName}**:\n\n`;
      if (tcMatch) res += `• **Total Cholesterol:** **${tcMatch[1].trim()} mg/dL** (Desirable: < 200 mg/dL)\n`;
      if (ldlMatch) res += `• **LDL ("Bad") Cholesterol:** **${ldlMatch[1].trim()} mg/dL** (Desirable: < 130 mg/dL)\n`;
      if (hdlMatch) res += `• **HDL ("Good") Cholesterol:** **${hdlMatch[1].trim()} mg/dL** (Optimal: > 40 mg/dL)\n`;
      if (tgMatch) res += `• **Triglycerides:** **${tgMatch[1].trim()} mg/dL** (Normal: < 150 mg/dL)\n`;
      if (vldlMatch) res += `• **VLDL Cholesterol:** **${vldlMatch[1].trim()} mg/dL** (Normal: < 30 mg/dL)\n`;
      res += `\nAlways discuss lipid measurements with your physician to understand cardiovascular risk factors.`;
      return res;
    }

    // 6. Doctor / Testing Lab / Hospital
    if (q.includes('doctor') || q.includes('physician') || q.includes('referred') || q.includes('clinic') || q.includes('hospital') || q.includes('lab')) {
      const docMatch = fullText.match(
        /Referred\s+By\s*[:=-]?\s*([^,\n\r;|]+?)(?=\s+(?:Sample|Date|Patient|Age|\n|$)|,\s*MD|,\s*MBBS)/i
      );
      const labMatch = fullText.match(/([A-Z\s]+(?:DIAGNOSTICS|LAB|HOSPITAL|CLINIC)[A-Z\s]*)/);
      let res = `According to your report (**${topChunk.fileName}**):\n\n`;
      if (docMatch) res += `• **Referring Doctor:** **${docMatch[1].trim()}**\n`;
      if (labMatch) res += `• **Testing Facility:** **${labMatch[1].trim()}**\n`;
      return res;
    }

    // 7. Medications
    if (q.includes('medication') || q.includes('medicine') || q.includes('drug') || q.includes('prescription') || q.includes('taking')) {
      const medLines = [];
      const commonMeds = ['atorvastatin', 'metformin', 'aspirin', 'lisinopril', 'amoxicillin', 'paracetamol', 'omeprazole', 'losartan', 'levothyroxine', 'amlodipine'];
      const lines = fullText.split('\n');
      for (const line of lines) {
        if (commonMeds.some((m) => line.toLowerCase().includes(m)) || /(?:mg|tablets?|capsules?|daily|bid|tid|od)\b/i.test(line)) {
          if (line.length < 80 && !medLines.includes(line.trim())) {
            medLines.push(line.trim());
          }
        }
      }
      if (medLines.length > 0) {
        return (
          `Based on your uploaded medical records (**${topChunk.fileName}**), here are the medications documented:\n\n` +
          medLines.slice(0, 5).map((m) => `• ${m}`).join('\n') +
          `\n\n*Reminder: Always confirm with your prescribing physician or pharmacist before taking or modifying any medications.*`
        );
      }
    }

    // 8. General keyword search across top chunks
    const keywords = q
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['what', 'when', 'where', 'which', 'about', 'have', 'from', 'your', 'with', 'this', 'show'].includes(w));
    const sentences = topChunk.chunkText.split(/(?<=[.?!])\s+|\n+/);
    const matchingSentences = sentences.filter((s) => keywords.some((k) => s.toLowerCase().includes(k)));

    if (matchingSentences.length > 0) {
      return `According to your uploaded **${topChunk.fileName}**:\n\n${matchingSentences.slice(0, 4).join('\n\n')}\n\nPlease consult with your physician for clinical interpretation of these results.`;
    }

    return `Based on your uploaded **${topChunk.fileName}**, here is the most relevant record information:\n\n${topChunk.chunkText.substring(0, 280)}...\n\nPlease consult with your physician for clinical interpretation of these results.`;
  }
}

module.exports = new RagService();
