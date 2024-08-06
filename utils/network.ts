import ip from "npm:ip";

export function getSubnetIps(cidr: string): string[] {
  const subnet = ip.cidrSubnet(cidr);
  const startIp = ip.toLong(subnet.networkAddress);
  const endIp = ip.toLong(subnet.broadcastAddress);

  return Array.from(
    { length: endIp - startIp },
    (_, i) => ip.fromLong(i + startIp),
  );
}
