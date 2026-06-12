import { motion } from 'motion/react';

interface McpServersTabContentProps {
    ScanLine: React.FC;
}

export const McpServersTabContent: React.FC<McpServersTabContentProps> = ({ ScanLine }) => {
    return (
        <motion.div
            key="mcp-servers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                Connected MCP Servers
            </h3>

            <div className="space-y-3 mb-6">
                {[
                    { name: 'Notion Server', status: 'Connected', url: 'https://notion.mcp.server' },
                    { name: 'GitHub Server', status: 'Connected', url: 'https://github.mcp.server' },
                    { name: 'Slack Server', status: 'Disconnected', url: 'https://slack.mcp.server' }
                ].map((server, index) => (
                    <motion.div
                        key={server.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl backdrop-blur-xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: server.status === 'Connected' ? '#22C55E' : '#EF4444',
                                boxShadow: `0 0 10px ${server.status === 'Connected' ? '#22C55E' : '#EF4444'}`
                              }}
                            />
                            <span className="font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
                              {server.name}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded" style={{
                            background: server.status === 'Connected'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                            color: server.status === 'Connected'
                              ? 'var(--snaps-accent-green)'
                              : '#EF4444',
                            border: server.status === 'Connected'
                              ? '1px solid rgba(34, 197, 94, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            {server.status}
                          </span>
                        </div>
                        <p className="text-xs font-mono" style={{ color: 'var(--snaps-text-secondary)' }}>
                          {server.url}
                        </p>
                    </motion.div>
                ))}
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl font-medium"
                style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-accent-blue)'
                }}
            >
                Add MCP Server
            </motion.button>

            <ScanLine />

            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                Server Configuration
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--snaps-text-secondary)' }}>
                MCP servers allow Snaps to connect with external tools and services. Configure your servers to enable seamless integrations.
            </p>
        </motion.div>
    );
};
