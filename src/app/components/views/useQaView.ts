import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateCard } from '@/services/cards';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import { getTroubleReport } from '@/services/testPlans';
import type { Card, Sprint, TroubleReport } from '@/services/types';

export function useQaView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'plans' | 'reports'>('plans');
  const [copied, setCopied] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [sprintCards, setSprintCards] = useState<Card[]>([]);
  const [troubleReport, setTroubleReport] = useState<TroubleReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(false);

  const fetchSprints = async () => {
    setIsLoading(true);
    try {
      const sprintsData = await getSprints(projectId!);
      setSprints(sprintsData);
      if (sprintsData.length > 0) {
        setSelectedSprintId(sprintsData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSprintCards = async (sprintId: string) => {
    setIsCardsLoading(true);
    try {
      const cards = await getCardsBySprint(sprintId);
      setSprintCards(cards);
    } catch (error) {
      console.error('Failed to fetch sprint cards:', error);
      setSprintCards([]);
    } finally {
      setIsCardsLoading(false);
    }
  };

  const fetchTroubleReportData = async () => {
    if (!projectId || !selectedSprintId) return;
    setIsLoading(true);
    try {
      const report = await getTroubleReport(projectId, selectedSprintId);
      setTroubleReport(report);
    } catch (error) {
      console.error('Failed to fetch trouble report:', error);
      setTroubleReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSprints();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchSprintCards(selectedSprintId);
      if (activeTab === 'reports') fetchTroubleReportData();
    }
  }, [selectedSprintId]);

  useEffect(() => {
    if (activeTab === 'reports' && selectedSprintId) {
      fetchTroubleReportData();
    }
  }, [activeTab]);

  const handleUpdateCard = async (cardId: string, updates: Partial<Card>) => {
    try {
      const updatedCard = await updateCard(cardId, updates);
      setSprintCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  const totalCards = sprintCards.length;
  const cardsWithBdd = sprintCards.filter(c => c.bdd_scenarios && c.bdd_scenarios.length > 0).length;
  const validatedCards = sprintCards.filter(c => c.bdd_validated).length;
  const pendingCards = cardsWithBdd - validatedCards;

  return {
    projectId,
    navigate,
    activeTab,
    setActiveTab,
    copied,
    setCopied,
    sprints,
    selectedSprintId,
    setSelectedSprintId,
    sprintCards,
    troubleReport,
    isLoading,
    isCardsLoading,
    handleUpdateCard,
    fetchTroubleReport: fetchTroubleReportData,
    selectedSprint,
    totalCards,
    cardsWithBdd,
    validatedCards,
    pendingCards
  };
}
