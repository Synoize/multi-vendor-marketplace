import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronRight,
  User,
} from "lucide-react";

const STATUS_COLORS = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-amber-50 text-amber-600",
  closed: "bg-emerald-50 text-emerald-600",
};

export default function Support() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("open");
  const [openTicketId, setOpenTicketId] = useState(null);
  const [reply, setReply] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets", activeTab],
    queryFn: async () => {
      const statusParam = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await api.get(`/support/tickets${statusParam}`);
      return res.data.data || [];
    },
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-ticket-detail", openTicketId],
    queryFn: async () => {
      const res = await api.get(`/support/tickets/${openTicketId}`);
      return res.data.data;
    },
    enabled: !!openTicketId,
  });

  const replyMutation = useMutation({
    mutationFn: async (message) => {
      return api.post(`/support/tickets/${openTicketId}/reply`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-ticket-detail", openTicketId],
      });
      setReply("");
      toast.success("Reply sent");
    },
    onError: () => {
      toast.error("Failed to send reply");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/support/tickets/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-ticket-detail", openTicketId],
      });
      toast.success("Ticket closed successfully");
    },
    onError: () => {
      toast.error("Failed to close ticket");
    },
  });

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate(reply);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Desk</h1>
        <p className="text-gray-500 text-sm">
          Respond to customer issues and support tickets
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: "open", label: "New / Open" },
          { id: "in_progress", label: "In Progress" },
          { id: "closed", label: "Closed" },
          { id: "all", label: "All Tickets" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100 h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10 text-gray-400" />}
              title="No tickets"
              description="No tickets in this folder."
            />
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setOpenTicketId(ticket.id)}
                className={`w-full text-left p-4 hover:bg-red-50 flex items-center justify-between transition-colors ${
                  openTicketId === ticket.id ? "bg-red-50" : ""
                }`}
              >
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {ticket.status?.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(ticket.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {ticket.subject}
                  </h4>
                  <p className="text-xs text-gray-500 capitalize">
                    {ticket.category} · Customer: {ticket.customer_name}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Right Message Chat Pane */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[500px]">
          {openTicketId ? (
            detailLoading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner size="lg" />
              </div>
            ) : ticketDetail ? (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-2xl">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {ticketDetail.subject}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      Category: {ticketDetail.category} ·{" "}
                      {ticketDetail.customer_name} ({ticketDetail.email})
                    </p>
                  </div>
                  {ticketDetail.status !== "closed" && (
                    <button
                      onClick={() => closeMutation.mutate(ticketDetail.id)}
                      className="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Close Ticket
                    </button>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {ticketDetail.messages?.map((msg) => {
                    const isAdmin = msg.sender_role === "admin";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isAdmin
                              ? "bg-red-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <User className="h-3 w-3 opacity-60" />
                            <span className="font-bold text-[10px] opacity-75">
                              {msg.sender_name}
                            </span>
                            <span className="text-[9px] opacity-50 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString(
                                "en-IN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Footer */}
                {ticketDetail.status !== "closed" ? (
                  <form
                    onSubmit={handleSendReply}
                    className="p-4 border-t border-gray-100 flex gap-2 bg-white rounded-b-2xl"
                  >
                    <input
                      type="text"
                      placeholder="Type your official reply here..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50"
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || replyMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400 font-semibold uppercase tracking-wider rounded-b-2xl">
                    This ticket is closed and resolved
                  </div>
                )}
              </div>
            ) : null
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <MessageSquare className="h-12 w-12" />
              <p className="text-sm font-medium">
                Select a ticket to open conversation thread
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
