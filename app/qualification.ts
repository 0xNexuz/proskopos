export type ProfileInput = {
  goals: string[]; stacks: string[]; chains: string[]; specialties: string[]; tools: string[];
  experienceLevel: string; minReward: number; availability: string; weeklyHours: number;
  difficultyPreference: string; participationMode: string; region: string;
};

export type QualifiableLead = {
  stack: string; category: string; reward: string; summary: string; launchStage: string;
  deadline: string; fundingSignal: string; evidenceConfidence: string; score: number;
  earningScore: number; technologies: string[]; topics: string[]; ecosystem: string;
  difficulty: string; competitionLevel: string; competitionConfidence: string;
  rewardPaths: string[]; participationRewards: boolean;
};

const parseMoney = (value: string) => Number((value.match(/[\d,.]+/)?.[0] ?? "0").replaceAll(",", ""));
const textMatch = (items: string[], haystack: string) => items.some((item) => haystack.toLowerCase().includes(item.toLowerCase()));

export function calculateFit(lead: QualifiableLead, profile: ProfileInput | null) {
  if (!profile) return { fitScore: 0, qualified: false, fitBreakdown: {}, reasons: ["Complete your profile to calculate fit."], qualificationGaps: ["Add your skills, availability, and preferences."] };
  const haystack = `${lead.stack} ${lead.category} ${lead.summary} ${lead.launchStage} ${lead.technologies.join(" ")} ${lead.topics.join(" ")} ${lead.ecosystem}`;
  const stackAndChain = textMatch([...profile.stacks, ...profile.chains], haystack) ? 25 : 6;
  const specialty = textMatch(profile.specialties, haystack) ? 15 : 5;
  const tools = profile.tools.length === 0 ? 8 : textMatch(profile.tools, haystack) ? 15 : 4;
  const experience = profile.experienceLevel === "Expert" ? 15 : profile.experienceLevel === "Experienced" ? 12 : 9;
  const engagement = textMatch(profile.goals, `${lead.category} ${lead.launchStage} ${lead.rewardPaths.join(" ")}`) ? 10 : 4;
  const rewardValue = parseMoney(lead.reward);
  const budget = profile.minReward === 0 || rewardValue >= profile.minReward ? 10 : rewardValue === 0 ? 5 : 2;
  const hoursNeeded = lead.difficulty === "Advanced" ? 15 : lead.difficulty === "Beginner" ? 5 : 10;
  const timeFit = profile.weeklyHours >= hoursNeeded || /flexible/i.test(profile.availability) ? 5 : 2;
  const modeText = `${lead.summary} ${lead.rewardPaths.join(" ")}`;
  const participation = profile.participationMode === "Either" || textMatch([profile.participationMode], modeText) ? 5 : 2;
  const fitBreakdown = { "Stack and chain": stackAndChain, Specialty: specialty, Tools: tools, Experience: experience, Goal: engagement, Budget: budget, "Time fit": timeFit, "Participation fit": participation };
  const fitScore = Object.values(fitBreakdown).reduce((sum, value) => sum + value, 0);
  const hardDisqualifier = profile.region !== "Global" && /restricted region|not eligible/i.test(lead.summary);
  const difficultyConflict = profile.difficultyPreference !== "Any" && profile.difficultyPreference !== lead.difficulty;
  const qualified = lead.score >= 70 && fitScore >= 75 && lead.earningScore >= 50 && !hardDisqualifier;
  const reasons = [
    stackAndChain === 25 ? `Matches ${lead.stack} and your ecosystem profile.` : "Adjacent to your selected stacks.",
    specialty === 15 ? "Matches a selected security specialty." : "Specialty match is partial.",
    `${lead.competitionLevel} competition (${lead.competitionConfidence}) with an earning-potential score of ${lead.earningScore}.`,
    lead.rewardPaths.length > 1 ? `${lead.rewardPaths.length} published or observed reward paths improve your options.` : lead.rewardPaths[0] ? `Primary reward path: ${lead.rewardPaths[0]}.` : "Reward structure is not yet published.",
    difficultyConflict ? `This is ${lead.difficulty}; you selected ${profile.difficultyPreference}.` : `${lead.difficulty} difficulty fits your preference.`,
  ];
  const qualificationGaps = qualified ? [] : [
    ...(lead.score < 70 ? [`Opportunity quality needs ${70 - lead.score} more points.`] : []),
    ...(fitScore < 75 ? [`Your personal fit needs ${75 - fitScore} more points.`] : []),
    ...(lead.earningScore < 50 ? [`Earning potential needs ${50 - lead.earningScore} more points or stronger evidence.`] : []),
    ...(stackAndChain < 25 ? [`Add ${lead.stack} or a matching chain if it reflects your experience.`] : []),
    ...(specialty < 15 ? ["Select a matching security specialty to strengthen this fit."] : []),
    ...(budget === 2 ? [`Lower your minimum reward to ${lead.reward} to include this opportunity.`] : []),
    ...(timeFit === 2 ? [`Set at least ${hoursNeeded} hours per week for this difficulty level.`] : []),
    ...(hardDisqualifier ? ["The published eligibility information conflicts with your region."] : []),
  ].slice(0, 4);
  return { fitScore, qualified, fitBreakdown, reasons, qualificationGaps };
}
