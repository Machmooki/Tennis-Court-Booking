import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface ETicketBookingLine {
  bookingId: string;
  courtName: string;
  /** Pre-formatted Asia/Bangkok date, e.g. "Aug 13, 2026". */
  date: string;
  /** Pre-formatted 24-hour range, e.g. "14:00 – 15:00". */
  timeRange: string;
}

export interface ETicketEmailProps {
  customerName: string;
  bookings: ETicketBookingLine[];
}

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Confirmed-booking E-Ticket rendered via `@react-email/components`
 * so Resend can compile it with `@react-email/render`.
 */
export function ETicketEmail({ customerName, bookings }: ETicketEmailProps) {
  const previewText =
    bookings.length === 1
      ? `Booking confirmed – ${bookings[0]?.courtName ?? "court"}`
      : `Booking confirmed – ${bookings.length} courts`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandLabel}>Tennis Court Booking</Text>
            <Heading as="h1" style={heading}>
              Your E-Ticket
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>Hi {customerName},</Text>
            <Text style={paragraph}>
              Your payment was successful. Show this ticket at the club or keep
              it as your confirmation.
            </Text>

            <Section style={statusBanner}>
              <Text style={statusText}>Confirmed</Text>
            </Section>

            {bookings.map((booking) => (
              <Section key={booking.bookingId} style={ticketCard}>
                <DetailRow
                  label="Booking ID"
                  value={booking.bookingId}
                  mono
                />
                <DetailRow label="Customer" value={customerName} />
                <DetailRow label="Court" value={booking.courtName} />
                <DetailRow label="Date" value={booking.date} />
                <DetailRow label="Time" value={booking.timeRange} last />
              </Section>
            ))}

            {bookings.length > 0 && (
              <Text style={footnote}>
                Times are shown in Asia/Bangkok (24-hour). Please arrive a few
                minutes early.
              </Text>
            )}
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated confirmation. Please do not reply to this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <Section style={last ? detailRowLast : detailRow}>
      <Text style={detailLabel}>{label}</Text>
      <Text style={mono ? detailValueMono : detailValue}>{value}</Text>
    </Section>
  );
}

const main: React.CSSProperties = {
  margin: 0,
  padding: "24px 12px",
  backgroundColor: "#f4f4f5",
  fontFamily,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e4e4e7",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  backgroundColor: "#18181b",
  padding: "24px 28px",
};

const brandLabel: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#a1a1aa",
};

const heading: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "22px",
  fontWeight: 600,
  color: "#ffffff",
  lineHeight: "1.3",
};

const content: React.CSSProperties = {
  padding: "28px",
};

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#3f3f46",
};

const statusBanner: React.CSSProperties = {
  margin: "0 0 24px",
  padding: "12px 16px",
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  border: "1px solid #a7f3d0",
};

const statusText: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 600,
  color: "#047857",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const ticketCard: React.CSSProperties = {
  margin: "0 0 16px",
  padding: "16px 18px",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
};

const detailRow: React.CSSProperties = {
  marginBottom: "12px",
};

const detailRowLast: React.CSSProperties = {
  marginBottom: 0,
};

const detailLabel: React.CSSProperties = {
  margin: "0 0 2px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const detailValue: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#18181b",
  lineHeight: "1.4",
  wordBreak: "break-all",
};

const detailValueMono: React.CSSProperties = {
  ...detailValue,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const footnote: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#71717a",
};

const divider: React.CSSProperties = {
  borderColor: "#f4f4f5",
  margin: 0,
};

const footer: React.CSSProperties = {
  padding: "16px 28px 24px",
};

const footerText: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#a1a1aa",
  textAlign: "center",
};

export default ETicketEmail;
