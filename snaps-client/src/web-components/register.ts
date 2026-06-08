import r2wc from '@r2wc/react-to-web-component';
import { SupportBoard } from '../components/SupportBoard';
import { RoadmapBoard } from '../components/RoadmapBoard';
import { BugReportForm } from '../components/BugReportForm';
import { FeatureRequestForm } from '../components/FeatureRequestForm';
import { GovernanceDocs } from '../components/GovernanceDocs';

// We register with shadow: "open" so styles are isolated.
// To make sure Tailwind styles are applied inside the Shadow DOM, the host
// or wrapper can inject CSS variables or we can let r2wc mount them.
// Wait, if shadow: "open" is used, the style sheet is typically injected.
// Since we set shadow: "open", we can also allow users to register without shadow if they want.
// Let's configure shadow: "open" as it's standard for Web Components.

const wcSupportBoard = r2wc(SupportBoard, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    defaultTab: 'string',
    pageSize: 'number',
    appName: 'string',
  },
});

const wcRoadmapBoard = r2wc(RoadmapBoard, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    showBacklog: 'boolean',
  },
});

const wcBugReportForm = r2wc(BugReportForm, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    appVersion: 'string',
    appName: 'string',
  },
});

const wcFeatureRequestForm = r2wc(FeatureRequestForm, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    appName: 'string',
  },
});

const wcGovernanceDocs = r2wc(GovernanceDocs, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
  },
});

export function registerAll() {
  if (typeof window !== 'undefined' && window.customElements) {
    if (!window.customElements.get('snaps-support-board')) {
      window.customElements.define('snaps-support-board', wcSupportBoard);
    }
    if (!window.customElements.get('snaps-roadmap-board')) {
      window.customElements.define('snaps-roadmap-board', wcRoadmapBoard);
    }
    if (!window.customElements.get('snaps-bug-report-form')) {
      window.customElements.define('snaps-bug-report-form', wcBugReportForm);
    }
    if (!window.customElements.get('snaps-feature-request-form')) {
      window.customElements.define('snaps-feature-request-form', wcFeatureRequestForm);
    }
    if (!window.customElements.get('snaps-governance-docs')) {
      window.customElements.define('snaps-governance-docs', wcGovernanceDocs);
    }
  }
}
