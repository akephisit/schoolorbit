import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface DashboardCard {
	title: string;
	value: string;
	description: string;
	icon: string;
	color: string;
}

interface DashboardResponse {
	data: DashboardCard[];
}

export const GET: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.me?.data?.user?.id) {
		return error(401, 'Unauthorized');
	}

	const userRoles = locals.me.data.roles || [];
	const userType = getUserType(userRoles);
	
	let cards: DashboardCard[];
	
	switch (userType) {
		case 'admin':
			cards = getAdminCards();
			break;
		case 'teacher':
			cards = getTeacherCards();
			break;
		case 'student':
			cards = getStudentCards();
			break;
		case 'parent':
			cards = getGuardianCards();
			break;
		default:
			cards = [];
	}

	return json({
		data: cards
	} satisfies DashboardResponse);
};

function getUserType(roles: string[]): string {
	if (roles.includes('admin')) return 'admin';
	if (roles.includes('teacher')) return 'teacher';
	if (roles.includes('student')) return 'student';
	if (roles.includes('parent')) return 'parent';
	return 'unknown';
}

function getAdminCards(): DashboardCard[] {
	return [
		{
			title: 'Total Users',
			value: '1,234',
			description: 'Active users in system',
			icon: 'users',
			color: 'blue'
		},
		{
			title: 'Active Classes',
			value: '45',
			description: 'Currently active classes',
			icon: 'book',
			color: 'green'
		},
		{
			title: 'Attendance Rate',
			value: '94.2%',
			description: 'Overall attendance this month',
			icon: 'calendar',
			color: 'purple'
		},
		{
			title: 'System Health',
			value: 'Optimal',
			description: 'All systems operational',
			icon: 'activity',
			color: 'emerald'
		}
	];
}

function getTeacherCards(): DashboardCard[] {
	return [
		{
			title: 'My Classes',
			value: '3',
			description: 'Classes assigned to you',
			icon: 'book',
			color: 'blue'
		},
		{
			title: "Today's Attendance",
			value: '87/92',
			description: 'Students present today',
			icon: 'check',
			color: 'green'
		},
		{
			title: 'Pending Grades',
			value: '12',
			description: 'Assignments to grade',
			icon: 'award',
			color: 'orange'
		},
		{
			title: 'Class Average',
			value: 'B+',
			description: 'Overall class performance',
			icon: 'trending-up',
			color: 'purple'
		}
	];
}

function getStudentCards(): DashboardCard[] {
	return [
		{
			title: 'My Classes Today',
			value: '6',
			description: 'Scheduled classes for today',
			icon: 'calendar',
			color: 'blue'
		},
		{
			title: 'Attendance Rate',
			value: '96.8%',
			description: 'Your attendance this semester',
			icon: 'check',
			color: 'green'
		},
		{
			title: 'Current GPA',
			value: '3.7',
			description: 'Grade point average',
			icon: 'award',
			color: 'purple'
		},
		{
			title: 'Upcoming Tests',
			value: '2',
			description: 'Tests scheduled this week',
			icon: 'file-text',
			color: 'orange'
		}
	];
}

function getGuardianCards(): DashboardCard[] {
	return [
		{
			title: 'Children',
			value: '2',
			description: "Students you're guardian for",
			icon: 'users',
			color: 'blue'
		},
		{
			title: 'Attendance This Week',
			value: '9/10',
			description: 'Combined attendance',
			icon: 'calendar',
			color: 'green'
		},
		{
			title: 'Recent Grades',
			value: 'A-',
			description: 'Latest grade average',
			icon: 'award',
			color: 'purple'
		},
		{
			title: 'Notifications',
			value: '3',
			description: 'Unread school notifications',
			icon: 'bell',
			color: 'red'
		}
	];
}