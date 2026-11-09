import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail, Scale } from "lucide-react";
import { LegalNavigation } from "./legal-navigation";
import { PrintDocument } from "./print-document";
import {
  LEGAL_COMPANY,
  LEGAL_CONTACT_HREF,
  LEGAL_DATE,
  LEGAL_VERSION,
} from "@/lib/legal/company";
import type { LegalDocument as Document } from "@/lib/legal/types";

export function LegalDocument({ document }: { document: Document }) {
  return (
    <div className="legal-document text-foreground">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3"
      >
        Skip to document
      </a>
      <div
        id="legal-content"
        className="legal-body mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
      >
        <div className="mb-10 max-w-4xl space-y-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary print:hidden"
          >
            <ArrowLeft className="size-4" />
            Back to BelivrHQ
          </Link>
          <p className="rule-label flex items-center gap-2">
            <Scale className="size-4" />
            Legal centre
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {document.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            {document.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>
              Effective and last updated:{" "}
              <time dateTime={LEGAL_VERSION}>{LEGAL_DATE}</time>
            </span>
            <span>Version {LEGAL_VERSION}</span>
          </div>
          <p className="text-sm font-medium">
            {LEGAL_COMPANY.name} · {LEGAL_COMPANY.country}
          </p>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <PrintDocument />
            <a
              href={LEGAL_CONTACT_HREF}
              className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Mail className="size-4" />
              Contact the company
            </a>
          </div>
        </div>
        <div className="grid min-w-0 items-start gap-10 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-14">
          <aside className="paper-card rounded-2xl p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto print:hidden">
            <nav aria-label="On this page">
              <h2 className="mb-4 text-sm font-semibold">On this page</h2>
              <ol className="space-y-3 text-xs leading-5 text-muted-foreground">
                {document.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="hover:text-primary focus-visible:underline"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article
            aria-label={document.title}
            className="min-w-0 max-w-[78ch] space-y-10 text-[15px] leading-7"
          >
            <div className="space-y-4">
              {document.introduction.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <aside
              className="rounded-2xl border border-brand/25 bg-brand-soft/40 p-5 sm:p-7"
              aria-labelledby="important-points"
            >
              <h2 id="important-points" className="mb-3 text-lg font-semibold">
                Important points to read first
              </h2>
              <ul className="list-disc space-y-3 pl-5">
                {document.highlights.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                These points help you navigate the document. Read the full
                provisions that follow.
              </p>
            </aside>
            {document.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-8 space-y-4 border-t pt-8"
              >
                <h2
                  id={`${section.id}-title`}
                  className="text-xl font-semibold leading-8 tracking-tight sm:text-2xl"
                >
                  {section.title}
                </h2>
                {section.notice && (
                  <p className="rounded-xl border border-brand/30 bg-brand-soft/40 p-5 font-semibold leading-7">
                    {section.notice}
                  </p>
                )}
                {section.table && (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-sm leading-6">
                      <caption className="sr-only">{section.title}</caption>
                      <thead className="bg-muted/60">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="min-w-[160px] px-4 py-3 font-semibold"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row[0]} className="border-t align-top">
                            {row.map((cell, index) =>
                              index === 0 ? (
                                <th
                                  key={index}
                                  scope="row"
                                  className="px-4 py-4 font-medium"
                                >
                                  {cell}
                                </th>
                              ) : (
                                <td
                                  key={index}
                                  className="min-w-[240px] px-4 py-4"
                                >
                                  {cell}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.paragraphs?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc space-y-3 pl-5">
                    {section.bullets.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <section
              className="paper-card rounded-2xl p-5 sm:p-7"
              aria-labelledby="legal-contact-title"
            >
              <h2 id="legal-contact-title" className="text-xl font-semibold">
                Contact {LEGAL_COMPANY.name}
              </h2>
              <p className="mt-3">
                For BelivrHQ privacy requests, legal notices or contractual
                enquiries, email{" "}
                <a
                  href={LEGAL_CONTACT_HREF}
                  className="break-all font-medium text-primary underline underline-offset-4"
                >
                  {LEGAL_COMPANY.email}
                </a>
                . You do not need a BelivrHQ account to use this contact.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Describe the matter and provide a safe reply channel. Do not
                send passwords, recovery codes, provider keys or unnecessary
                sensitive church records.
              </p>
            </section>
          </article>
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-4 pb-4 sm:px-6 print:hidden">
        <LegalNavigation label="Related legal documents" />
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-brand"
        >
          Help Centre
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
