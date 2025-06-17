import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role, subjectsData } from "@/lib/data";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma } from "@prisma/client";

type SubjectList = {
  id: number;
  name: string;
  subjectTeachers: {
    teacher: {
      id: string;
      name: string;
    };
  }[];
};

const columns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Teachers",
    accessor: "teachers",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const renderRow = (item: SubjectList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">
      {item.subjectTeachers?.map((st: any) => st.teacher.name).join(", ") ||
        "No teachers assigned"}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="subject" type="update" data={item} />
            <FormContainer table="subject" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string } | undefined;
}) => {
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;

  // Build query with search parameters
  const query: any = {};

  if (searchParams) {
    if (searchParams.search) {
      query.OR = [
        { name: { contains: searchParams.search, mode: "insensitive" } },
      ];
    }

    if (searchParams.subjectId) {
      query.teachers = { some: { id: searchParams.subjectId } };
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        subjectTeachers: {
          include: {
            teacher: true,
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.subject.count({ where: query }),
  ]);

  console.log(
    `Total subjects: ${count}, Current page: ${page}, Items per page: ${ITEM_PER_PAGE}`
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-brightYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-brightYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainer table="subject" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default SubjectListPage;
