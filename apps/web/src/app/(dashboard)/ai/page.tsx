/**
 * AI Assistant Page (app/(dashboard)/ai/page.tsx)
 *
 * WHAT: An AI-powered chat interface where users can ask questions about their IoT data
 *       in plain English. It also has tabs for anomaly detection visualization and
 *       telemetry summaries.
 *
 * WHY IT EXISTS: Not everyone wants to dig through tables and charts to understand their
 *               IoT data. This page lets users ask questions like "What's the average
 *               temperature?" or "Are there any anomalies?" and get instant answers.
 *
 * The page has three tabs:
 *   1. Chat: A conversational AI assistant. Users type questions, get answers.
 *      - Shows suggested queries to help users get started
 *      - Messages are sent to the backend AI service via the API
 *      - Auto-scrolls to the latest message
 *   2. Anomaly Detection: A chart that highlights data points outside normal ranges.
 *      - Users pick a device, metric, and time range
 *      - Red/yellow dots on the chart show where values exceeded expected bounds
 *      - Dashed lines show the "expected" upper and lower limits
 *   3. Telemetry Summary: A grid of summary metrics with period-over-period changes.
 *
 * Data flow (Chat tab):
 *   User types message -> handleSend() -> apiClient.post("/api/ai/query") -> AI backend
 *   -> response with answer + confidence score -> displayed in chat
 *
 * Data flow (Anomaly tab):
 *   Mock data is displayed directly. In production, the "Run Detection" button would
 *   call an API endpoint that runs anomaly detection algorithms on the selected device's data.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@cortexgrid/ui/components/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@cortexgrid/ui/components/Card";
import { ChatMessage } from "@/components/ai/chat-message";
import { apiClient } from "@/lib/api-client";

// Shape of a single chat message in the conversation.
// "role" determines how it's styled: "user" messages align right, "assistant" align left.
interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Shape of a data point used in the anomaly detection chart.
// isAnomaly and severity are set by the backend's anomaly detection algorithm.
interface AnomalyPoint {
  timestamp: string;
  value: number;
  expectedMin: number;
  expectedMax: number;
  isAnomaly: boolean;
  severity: "low" | "medium" | "high";
}

// Pre-built query suggestions shown in the sidebar.
// These help users understand what kind of questions they can ask.
// When clicked, the "query" text is sent directly to the AI as if the user typed it.
const SUGGESTED_QUERIES = [
  {
    icon: <Thermometer className="h-4 w-4" />,
    label: "Average temperature across all devices",
    query: "What is the average temperature reading across all devices in the last 24 hours?",
  },
  {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Any anomalies detected recently?",
    query: "Have there been any anomalies detected in the telemetry data recently?",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Device health summary",
    query: "Give me a summary of device health and connectivity status.",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    label: "Data ingestion trends",
    query: "What are the data ingestion trends for this week?",
  },
];

// Mock anomaly data for the Anomaly Detection tab.
// Points where isAnomaly=true have values outside the expectedMin/expectedMax range.
// severity indicates how far outside the bounds: "high" = way outside, "medium" = slightly outside.
const MOCK_ANOMALY_DATA: AnomalyPoint[] = [
  { timestamp: "10:00", value: 22.1, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "10:15", value: 22.5, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "10:30", value: 23.0, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  // These two points at 10:45 and 11:00 are flagged as anomalies (value > 28 expectedMax)
  { timestamp: "10:45", value: 35.2, expectedMin: 20, expectedMax: 28, isAnomaly: true, severity: "high" },
  { timestamp: "11:00", value: 33.8, expectedMin: 20, expectedMax: 28, isAnomaly: true, severity: "high" },
  { timestamp: "11:15", value: 27.5, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "11:30", value: 24.2, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "11:45", value: 23.8, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "12:00", value: 23.1, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  // This point at 12:15 is a "medium" anomaly (slightly above the 28 threshold)
  { timestamp: "12:15", value: 29.5, expectedMin: 20, expectedMax: 28, isAnomaly: true, severity: "medium" },
  { timestamp: "12:30", value: 23.4, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
  { timestamp: "12:45", value: 22.9, expectedMin: 20, expectedMax: 28, isAnomaly: false, severity: "low" },
];

// Summary metrics shown in the Telemetry Summary tab.
// These represent aggregated statistics calculated by the AI service.
const MOCK_SUMMARY_METRICS = [
  { metric: "Avg Temperature", value: "23.4 C", change: "+1.2 C" },
  { metric: "Avg Humidity", value: "45.8%", change: "-2.3%" },
  { metric: "Active Devices", value: "42 / 52", change: "+3" },
  { metric: "Anomalies (24h)", value: "3", change: "+1" },
];

/**
 * AIAssistantPage - The main AI-powered analysis interface.
 *
 * State management:
 *   - messages: array of chat messages (user questions + AI responses)
 *   - input: current text in the chat input box
 *   - isLoading: whether we're waiting for an AI response
 *   - activeTab: which of the 3 tabs (chat/anomaly/summary) is showing
 *   - anomalyDevice/anomalyMetric: selected parameters for anomaly detection
 */
export default function AIAssistantPage() {
  // Chat messages start with a welcome message from the AI assistant.
  // This gives users immediate context about what the AI can do.
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your CortexGrid AI assistant. I can help you analyze telemetry data, detect anomalies, summarize device health, and answer questions about your IoT infrastructure. What would you like to know?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "anomaly" | "summary">("chat");
  // Ref to the invisible div at the bottom of the chat, used for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Anomaly detection panel: which device and metric to analyze
  const [anomalyDevice, setAnomalyDevice] = useState("dev-001");
  const [anomalyMetric, setAnomalyMetric] = useState("temperature");

  // Auto-scroll to the bottom of the chat whenever a new message is added.
  // This ensures the user always sees the latest message.
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * handleSend - Sends a message to the AI assistant.
   *
   * @param query - Optional pre-written query (from suggested queries). If not provided, uses the input box text.
   *
   * Flow:
   * 1. Get the message text (either from the parameter or the input box)
   * 2. Add the user's message to the chat immediately (optimistic UI)
   * 3. Send the query to the AI backend API
   * 4. On success: add the AI's response to the chat
   * 5. On failure: add an error message as the AI's response
   * 6. Always set isLoading to false when done
   */
  const handleSend = useCallback(
    async (query?: string) => {
      // Use the provided query text, or fall back to whatever the user typed in the input box
      const messageText = query ?? input.trim();
      if (!messageText) return;

      // Create the user's message and add it to the chat immediately
      const userMessage: ChatMessageData = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Send the query to the AI backend. The response includes the answer and a confidence score.
        const response = await apiClient.post<{
          answer: string;
          confidence: number;
        }>("/api/ai/query", { query: messageText });

        // Add the AI's answer to the chat
        const assistantMessage: ChatMessageData = {
          id: `msg-${Date.now()}-resp`,
          role: "assistant",
          content: response.answer,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        // If the API call fails, show a friendly error message instead of crashing
        const errorMessage: ChatMessageData = {
          id: `msg-${Date.now()}-err`,
          role: "assistant",
          content:
            "I'm sorry, I couldn't process your query. Please try again or check your connection.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input]
  );

  // Keyboard shortcut: pressing Enter (without Shift) sends the message.
  // Shift+Enter allows the user to add a new line without sending.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          AI Assistant
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Analyze telemetry, detect anomalies, and get intelligent insights
        </p>
      </div>

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700">
        {(
          [
            { key: "chat", label: "Chat", icon: <Sparkles className="h-4 w-4" /> },
            { key: "anomaly", label: "Anomaly Detection", icon: <AlertTriangle className="h-4 w-4" /> },
            { key: "summary", label: "Telemetry Summary", icon: <BarChart3 className="h-4 w-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "chat" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="flex flex-col xl:col-span-3">
            <Card className="flex flex-1 flex-col">
              <CardContent className="flex flex-1 flex-col p-0">
                <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin" style={{ maxHeight: "500px" }}>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your query...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-dark-200 p-4 dark:border-dark-700">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your IoT data..."
                      className="flex-1 rounded-lg border border-dark-300 bg-white px-4 py-2.5 text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      size="md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Suggested Queries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SUGGESTED_QUERIES.map((sq) => (
                  <button
                    key={sq.label}
                    onClick={() => handleSend(sq.query)}
                    className="flex w-full items-center gap-3 rounded-lg border border-dark-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-dark-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                    disabled={isLoading}
                  >
                    <span className="text-primary-500">{sq.icon}</span>
                    <span className="text-xs font-medium text-dark-700 dark:text-dark-300">
                      {sq.label}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "anomaly" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Detection Parameters</CardTitle>
              <CardDescription>
                Configure anomaly detection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                  Device
                </label>
                <select
                  value={anomalyDevice}
                  onChange={(e) => setAnomalyDevice(e.target.value)}
                  className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                >
                  <option value="dev-001">Temperature Sensor A1</option>
                  <option value="dev-002">Humidity Sensor B3</option>
                  <option value="dev-004">Smart Valve Actuator</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                  Metric
                </label>
                <select
                  value={anomalyMetric}
                  onChange={(e) => setAnomalyMetric(e.target.value)}
                  className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                >
                  <option value="temperature">Temperature</option>
                  <option value="humidity">Humidity</option>
                  <option value="pressure">Pressure</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                  Time Range
                </label>
                <select className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100">
                  <option value="1h">Last 1 hour</option>
                  <option value="6h">Last 6 hours</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
              <Button className="w-full" leftIcon={<AlertTriangle className="h-4 w-4" />}>
                Run Detection
              </Button>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Anomaly Detection Results</CardTitle>
              <CardDescription>
                3 anomalies detected in the selected time range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_ANOMALY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-dark-200 dark:stroke-dark-700" />
                    <XAxis dataKey="timestamp" tick={{ fill: "rgb(107 114 128)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "rgb(107 114 128)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgb(255 255 255)",
                        borderColor: "rgb(229 231 235)",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                      }}
                    />
                    <ReferenceLine y={28} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Upper", fill: "#ef4444", fontSize: 11 }} />
                    <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Lower", fill: "#ef4444", fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={(props: Record<string, unknown>) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: AnomalyPoint };
                        if (payload.isAnomaly) {
                          return (
                            <circle
                              key={`dot-${payload.timestamp}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill={payload.severity === "high" ? "#ef4444" : "#f59e0b"}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }
                        return <circle key={`dot-${payload.timestamp}`} cx={cx} cy={cy} r={3} fill="#3b82f6" />;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expectedMax"
                      stroke="#9ca3af"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expectedMin"
                      stroke="#9ca3af"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-danger-500" />
                  <span className="text-dark-600 dark:text-dark-400">
                    High severity anomaly
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-warning-500" />
                  <span className="text-dark-600 dark:text-dark-400">
                    Medium severity anomaly
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-dark-300" />
                  <span className="text-dark-600 dark:text-dark-400">
                    Expected range
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {MOCK_SUMMARY_METRICS.map((item) => (
            <Card key={item.metric}>
              <CardContent className="p-5">
                <p className="text-sm font-medium text-dark-500 dark:text-dark-400">
                  {item.metric}
                </p>
                <p className="mt-2 text-2xl font-bold text-dark-900 dark:text-dark-50">
                  {item.value}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    item.change.startsWith("+")
                      ? "text-success-600 dark:text-success-400"
                      : "text-danger-600 dark:text-danger-400"
                  }`}
                >
                  {item.change} from last period
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
