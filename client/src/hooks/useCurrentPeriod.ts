import { useQuery } from "@tanstack/react-query";

interface CurrentPeriod {
  id: string;
  name: string;
  description?: string;
  period: number | string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
  totalDays: number;
  remainingDays: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrentPeriodResponse {
  success: boolean;
  data: CurrentPeriod | null;
  message?: string;
}

export const useCurrentPeriod = () => {
  return useQuery<CurrentPeriodResponse>({
    queryKey: ["currentPeriod"],
    queryFn: async () => {
      const response = await fetch("/api/periods/current", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar período atual");
      }

      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
};
