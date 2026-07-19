export type ProfileInput = {
  goals: string[]; stacks: string[]; chains: string[]; specialties: string[];
  experienceLevel: string; minReward: number; availability: string; region: string;
};

export type QualifiableLead = {
  stack: string; category: string; reward: string; summary: string; launchStage: string;
  deadline: string; fundingSignal: string; evidenceConfidence: string; score: number;
};

const parseMoney = (value: string) => Number((value.match(/[\d,.]+/)?.[0] ?? "0").replaceAll(",", ""));
const textMatch = (items: string[], haystack: string) => items.some((item) => haystack.toLowerCase().includes(item.toLowerCase()));

export function calculateFit(lead: QualifiableLead, profile: ProfileInput | null) {
  if (!profile) return { fitScore: 0, qualified: false, fitBreakdown: {}, reasons: ["Complete your profile to calculate fit."] };
  const haystack = `${lead.stack} ${lead.category} ${lead.summary} ${lead.launchStage}`;
  const stack = textMatch([...profile.stacks, ...profile.chains], haystack) ? 30 : 8;
  const domain = textMatch(profile.specialties, haystack) ? 20 : 6;
  const experience = profile.experienceLevel === "Expert" ? 15 : profile.experienceLevel === "Experienced" ? 13 : 10;
  const engagement = textMatch(profile.goals, `${lead.category} ${lead.launchStage}`) ? 15 : 7;
  const rewardValue = parseMoney(lead.reward);
  const budget = profile.minReward === 0 || rewardValue >= profile.minReward ? 10 : rewardValue === 0 ? 5 : 2;
  const availability = /ongoing|early|upcoming|active|open|live/i.test(`${lead.deadline} ${lead.launchStage}`) ? 10 : 6;
  const fitBreakdown = { "Stack and chain": stack, Domain: domain, Experience: experience, Engagement: engagement, Budget: budget, Availability: availability };
  const fitScore = Object.values(fitBreakdown).reduce((sum, value) => sum + value, 0);
  const hardDisqualifier = profile.region !== "Global" && /restricted region|not eligible/i.test(lead.summary);
  const qualified = lead.score >= 70 && fitScore >= 75 && !hardDisqualifier;
  const reasons = [
    stack === 30 ? `Matches ${lead.stack}.` : "Adjacent to your selected stacks.",
    domain === 20 ? "Matches a selected specialty." : "Domain match is partial.",
    rewardValue ? `${lead.reward} clears the recorded budget check.` : "Reward is not yet published.",
  ];
  return { fitScore, qualified, fitBreakdown, reasons };
}
