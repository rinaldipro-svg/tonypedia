---
title: "Brussels Rules: How the EU AI Act Is Forcing Silicon Valley to Redesign Its Products"
description: "US tech giants face a stark choice: build AI products that meet Europe's strict rules globally, or split into two worlds."
category: "tech"
tags: ["ai", "regulation", "european-union", "silicon-valley", "compliance"]
author: "Tony"
heroImage: ""
pubDate: 2026-03-04
readingTime: 9
featured: false
draft: false
---

In January 2026, a team of engineers at a major San Francisco AI company gathered in a windowless conference room to discuss a problem that had nothing to do with model architecture or training data. The question on the whiteboard was deceptively simple: do we build one product or two? On one side of the Atlantic, their flagship AI assistant could scan a user's browsing history, infer political leanings, and tailor content recommendations accordingly. On the other, that same capability had just become illegal.

The EU AI Act, which entered its most consequential enforcement phase in August 2025, didn't arrive without warning. Brussels had been telegraphing its intentions since 2021. Yet the practical reality of compliance — the specific engineering decisions, the product redesigns, the org chart reshuffles — has hit American technology companies with a force that many executives privately admit they underestimated. The regulation doesn't just set rules. It imposes a fundamentally different philosophy about what AI systems should be allowed to do, and it's rewriting product roadmaps from Cupertino to Mountain View.

What makes this moment different from previous transatlantic regulatory clashes is scale. The AI Act doesn't target a single practice like data collection. It classifies entire categories of AI systems by risk level and attaches binding obligations to each tier. For companies whose business models depend on deploying AI at every layer of their product stack, the compliance surface area is enormous.

## The Two-Track Dilemma

The central strategic question facing every major US AI company is what insiders have started calling the "fork or fold" decision. Fork means maintaining separate product versions for Europe and the rest of the world — one compliant with the AI Act, one unconstrained. Fold means adopting the EU's standards globally, accepting the restrictions everywhere to avoid the engineering overhead of parallel systems.

Microsoft has largely chosen to fold. Its Copilot products now ship with the same transparency disclosures and risk documentation worldwide, a decision driven as much by engineering pragmatism as principle. Maintaining two divergent codebases for the same product, with different content moderation rules, different data handling pipelines, and different user-facing disclosures, is expensive and error-prone. Brad Smith, Microsoft's vice chair, has publicly framed this as a competitive advantage, arguing that building to the highest standard simplifies operations globally.

Google has taken a more hybrid approach. Its core search and advertising products comply with the AI Act in Europe, but several experimental features — including some advanced personalization tools in Gemini — are simply unavailable to EU users. The company hasn't announced whether these features will eventually be reworked for compliance or remain US-only. This selective withholding echoes a familiar pattern: Google News shut down in Spain for years rather than comply with a local licensing law, and some of its AI-powered features in Search still aren't available across all EU member states.

Meta represents the most aggressive version of the fork strategy. Mark Zuckerberg has been vocal about what he sees as European overreach, and Meta's approach reflects that posture. Its most advanced AI recommendation systems operate under different parameters in the EU, with certain behavioral inference capabilities disabled entirely. The company has framed this as respecting local law, but the practical effect is that European users of Instagram and Facebook interact with measurably less sophisticated AI systems than their American counterparts.

## What Compliance Actually Looks Like at the Engineering Level

The public debate about the AI Act tends to focus on its headline prohibitions — the ban on social scoring, restrictions on real-time biometric surveillance, limits on emotion recognition. These are important, but they affect a relatively small number of companies. The provisions reshaping the broadest swath of Silicon Valley's product portfolio are less dramatic and far more technical.

**High-risk classification** is where the real compliance burden lives. AI systems used in employment decisions, creditworthiness assessments, education, and critical infrastructure must meet stringent requirements around documentation, human oversight, accuracy testing, and bias auditing. For a company like Workday, whose AI-driven hiring tools are used by thousands of enterprises, this has meant building an entirely new compliance infrastructure — model cards for every deployed system, audit trails for every automated decision, and human review mechanisms that didn't previously exist.

The documentation requirements alone are formidable. High-risk AI systems must come with technical documentation detailed enough for regulators to assess how the system was built, what data it was trained on, what its known limitations are, and how it performs across different demographic groups. For companies accustomed to treating their models as proprietary black boxes, this represents a cultural shift as much as a technical one.

Then there's the obligation around human oversight. The AI Act requires that high-risk systems be designed so that humans can effectively supervise their operation and, when necessary, override their outputs. This sounds straightforward, but implementing it at scale is anything but. A recruiter using an AI tool to screen ten thousand resumes per day cannot meaningfully review each decision. The question of what constitutes "effective" human oversight is now the subject of intense negotiation between companies and the newly established EU AI Office.

## The Brussels Effect, Version 2.0

Anu Bradford, the Columbia Law School professor who coined the term **"Brussels Effect"** to describe how EU regulations become de facto global standards, has argued that the AI Act will follow the same trajectory as GDPR. The logic is straightforward: if you're already building for the world's most demanding regulatory environment, it's often cheaper to apply those standards everywhere than to maintain separate systems.

The early evidence is mixed. GDPR did become a global template, but it also created a compliance industry estimated at over $9 billion annually, and many companies — particularly mid-sized ones — responded not by raising standards globally but by blocking European users or offering stripped-down EU versions of their products. The AI Act's complexity makes this dynamic even more likely. GDPR was fundamentally about data handling. The AI Act reaches into model design, training methodology, and deployment architecture — layers of the technology stack where regional variation is far more costly to implement.

There are signs that the Brussels Effect is operating selectively. For foundational infrastructure — the base models from OpenAI, Anthropic, and Google that power thousands of downstream applications — compliance pressure is pushing toward global standardization. These companies can't easily maintain forked versions of GPT or Claude, and the reputational cost of offering a "lesser" model to Europe is significant. Sam Altman initially threatened to pull OpenAI out of the EU entirely during the Act's legislative phase, then reversed course. Today, OpenAI's models ship with EU-compliant transparency features worldwide.

For application-layer products, though, fragmentation is accelerating. Smaller companies and startups are making explicit decisions to deprioritize the European market, at least temporarily. A 2025 survey by the venture capital firm Index Ventures found that 34% of US-based AI startups planned to delay their European launch by at least twelve months specifically due to AI Act compliance costs. The median estimated cost of initial compliance for a high-risk AI system was $2.3 million — a manageable expense for Google, a potentially fatal one for a Series A company.

## The Compliance Industrial Complex

Where there's regulation, there's a compliance industry, and the AI Act has spawned one at remarkable speed. Law firms, consultancies, and a new category of "AI audit" startups have built practices around helping companies navigate the Act's requirements. Deloitte and PwC both launched dedicated AI Act advisory practices in 2025. Smaller firms like Holistic AI and Credo AI, which specialize in algorithmic auditing, have seen their client rosters expand dramatically.

This emerging compliance infrastructure has its own gravitational pull. Once a company invests millions in building AI Act-compliant processes — the documentation systems, the bias testing frameworks, the human oversight mechanisms — those investments tend to become permanent features of how the company builds products. The compliance apparatus becomes self-sustaining, shaping product decisions even in markets where the regulation doesn't technically apply.

There's a parallel to the financial sector's experience with post-2008 regulation. Banks initially treated Dodd-Frank and Basel III compliance as burdens to be minimized. Over time, the compliance functions became embedded in how these institutions operated, influencing everything from product design to risk appetite. The same pattern is emerging in AI. Companies that have invested heavily in compliance infrastructure are beginning to treat it not as a cost center but as a quality signal — a way to differentiate their products in an increasingly crowded and scrutiny-prone market.

## Where the Friction Points Are Heading

The AI Act's enforcement is still in its early stages, and the most contentious battles lie ahead. The classification of general-purpose AI models — the large language models that power everything from chatbots to code assistants — remains genuinely unsettled. The Act creates a category for "general-purpose AI" with specific transparency obligations, and a higher tier for models deemed to pose "systemic risk." Which models fall into which category is a determination that will be made by the EU AI Office, and the criteria are still being refined.

Anthropic, OpenAI, and Google have all engaged in intensive lobbying around where these lines get drawn. The stakes are high: a model classified as posing systemic risk faces mandatory adversarial testing, incident reporting requirements, and cybersecurity obligations that go well beyond what any of these companies currently practice. The classification decisions expected later this year will likely trigger the next wave of product redesigns.

The tension between Europe and the United States on AI governance shows no sign of resolving into alignment. The Trump administration's approach — executive orders emphasizing innovation and competitiveness, with minimal binding regulation — stands in deliberate contrast to Brussels. This divergence creates a persistent structural challenge for companies operating in both markets. Every product decision becomes a negotiation between two regulatory philosophies: one that treats AI primarily as an economic opportunity, and another that treats it primarily as a societal risk to be managed.

For Silicon Valley's product teams, the practical implication is that the whiteboard question from that San Francisco conference room isn't going away. If anything, it's expanding. As the AI Act's provisions continue to take effect through 2027 — with the most demanding requirements for high-risk systems arriving in phases — the fork-or-fold decision will need to be made not once, but repeatedly, for every new feature and capability that touches European users. The companies that build their architectures to accommodate this reality from the start will have a structural advantage. The ones that treat compliance as an afterthought will find themselves in that windowless conference room more often than they'd like.
